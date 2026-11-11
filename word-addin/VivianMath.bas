Attribute VB_Name = "VivianMath"
Option Explicit

' Vivian Math buttons for Microsoft Word (Word 2007 and later on Windows).
'
' This module lives in VivianMath.dotm inside Word's STARTUP folder. It adds a
' "Vivian Math" toolbar, shown on the Add-Ins tab of the ribbon.
'
' Each equation is an inline picture. Its alternative text holds "VivianMath:"
' followed by the LaTeX source, so the equation can be reopened and edited.
'
' Word and the Vivian Math app talk through a temporary folder:
'   Word writes  latex.txt, fontsize.txt           (UTF-8)
'   App writes   result.png, result.txt, size.txt  then done.flag
'   App writes   cancel.flag if the window is closed without inserting
' size.txt holds "width;height;depth" in points with a dot as decimal separator.
'
' VBA sources are ANSI, so Vietnamese text is stored as ChrW() codes in T().

Private Const TAG As String = "VivianMath:"
Private Const BAR_NAME As String = "Vivian Math"
Private Const WAIT_SECONDS As Long = 3600

#If VBA7 Then
Private Declare PtrSafe Sub Sleep Lib "kernel32" (ByVal dwMilliseconds As Long)
#Else
Private Declare Sub Sleep Lib "kernel32" (ByVal dwMilliseconds As Long)
#End If

' Vietnamese interface text, shown here without accents for reference:
'   CAP_INSERT = Chen cong thuc
'   CAP_NUMBERED = Chen cong thuc co danh so
'   CAP_EDIT = Sua cong thuc
'   CAP_UPDATE = Cap nhat so thu tu
'   MSG_NO_DOC = Hay mo mot van ban truoc.
'   MSG_SELECT = Hay bam chon mot cong thuc Vivian Math trong van ban roi bam lai.
'   MSG_NO_APP = Khong mo duoc phan mem Vivian Math. Hay mo Vivian Math va bam "Cai vao Word" lai.
'   MSG_ERROR = Khong chen duoc cong thuc: 
Private Function T(ByVal key As String) As String
    If key = "CAP_INSERT" Then T = "Ch" & ChrW(232) & "n c" & ChrW(244) & "ng th" & ChrW(7913) & "c"
    If key = "CAP_NUMBERED" Then T = "Ch" & ChrW(232) & "n c" & ChrW(244) & "ng th" & ChrW(7913) & "c c" & ChrW(243) & " " & ChrW(273) & ChrW(225) & "nh s" & ChrW(7889)
    If key = "CAP_EDIT" Then T = "S" & ChrW(7917) & "a c" & ChrW(244) & "ng th" & ChrW(7913) & "c"
    If key = "CAP_UPDATE" Then T = "C" & ChrW(7853) & "p nh" & ChrW(7853) & "t s" & ChrW(7889) & " th" & ChrW(7913) & " t" & ChrW(7921)
    If key = "MSG_NO_DOC" Then T = "H" & ChrW(227) & "y m" & ChrW(7903) & " m" & ChrW(7897) & "t v" & ChrW(259) & "n b" & ChrW(7843) & "n tr" & ChrW(432) & ChrW(7899) & "c."
    If key = "MSG_SELECT" Then T = "H" & ChrW(227) & "y b" & ChrW(7845) & "m ch" & ChrW(7885) & "n m" & ChrW(7897) & "t c" & ChrW(244) & "ng th" & ChrW(7913) & "c Vivian Math trong v" & ChrW(259) & "n b" & ChrW(7843) & "n r" & ChrW(7891) & "i b" & ChrW(7845) & "m l" & ChrW(7841) & "i."
    If key = "MSG_NO_APP" Then T = "Kh" & ChrW(244) & "ng m" & ChrW(7903) & " " & ChrW(273) & ChrW(432) & ChrW(7907) & "c ph" & ChrW(7847) & "n m" & ChrW(7873) & "m Vivian Math. H" & ChrW(227) & "y m" & ChrW(7903) & " Vivian Math v" & ChrW(224) & " b" & ChrW(7845) & "m " & ChrW(34) & "C" & ChrW(224) & "i v" & ChrW(224) & "o Word" & ChrW(34) & " l" & ChrW(7841) & "i."
    If key = "MSG_ERROR" Then T = "Kh" & ChrW(244) & "ng ch" & ChrW(232) & "n " & ChrW(273) & ChrW(432) & ChrW(7907) & "c c" & ChrW(244) & "ng th" & ChrW(7913) & "c: "
End Function

' Runs when Word loads this global template.
Public Sub AutoExec()
    BuildToolbar
End Sub

Public Sub BuildToolbar()
    Dim bar As Object
    On Error Resume Next
    Application.CommandBars(BAR_NAME).Delete
    On Error GoTo 0
    ' Keep the toolbar out of Normal.dotm so Word never asks to save it.
    CustomizationContext = ThisDocument
    Set bar = Application.CommandBars.Add(Name:=BAR_NAME, Position:=1, Temporary:=True)
    AddButton bar, T("CAP_INSERT"), "VM_Insert"
    AddButton bar, T("CAP_NUMBERED"), "VM_InsertNumbered"
    AddButton bar, T("CAP_EDIT"), "VM_Edit"
    AddButton bar, T("CAP_UPDATE"), "VM_UpdateNumbers"
    bar.Visible = True
    ThisDocument.Saved = True
End Sub

Private Sub AddButton(ByVal bar As Object, ByVal caption As String, ByVal macro As String)
    With bar.Controls.Add(Type:=1)
        .caption = caption
        .Style = 2
        .OnAction = macro
    End With
End Sub

Public Sub VM_Insert()
    DoInsert False
End Sub

Public Sub VM_InsertNumbered()
    DoInsert True
End Sub

Public Sub VM_Edit()
    If Documents.Count = 0 Then
        MsgBox T("MSG_NO_DOC"), vbInformation, BAR_NAME
    ElseIf SelectedEquation() Is Nothing Then
        MsgBox T("MSG_SELECT"), vbInformation, BAR_NAME
    Else
        DoInsert False
    End If
End Sub

Public Sub VM_UpdateNumbers()
    If Documents.Count > 0 Then ActiveDocument.Fields.Update
End Sub

' The selected Vivian Math equation, or Nothing.
Private Function SelectedEquation() As InlineShape
    Dim shp As InlineShape
    Set SelectedEquation = Nothing
    If Selection.InlineShapes.Count < 1 Then Exit Function
    Set shp = Selection.InlineShapes(1)
    If Left$(shp.AlternativeText, Len(TAG)) = TAG Then Set SelectedEquation = shp
End Function

Private Sub DoInsert(ByVal numbered As Boolean)
    Dim old As InlineShape, target As Range
    Dim latexIn As String, latexOut As String, png As String
    Dim fontSize As Single, w As Single, h As Single, depth As Single

    If Documents.Count = 0 Then
        MsgBox T("MSG_NO_DOC"), vbInformation, BAR_NAME
        Exit Sub
    End If
    On Error GoTo Failed

    Set old = SelectedEquation()
    If Not old Is Nothing Then latexIn = Mid$(old.AlternativeText, Len(TAG) + 1)

    ' Mixed sizes in the selection report a huge "undefined" value.
    fontSize = Selection.Font.Size
    If fontSize < 6 Or fontSize > 96 Then fontSize = 12

    ' Remember where to insert: the user may click elsewhere while the app is open.
    Set target = Selection.Range
    If Not RunEditor(latexIn, fontSize, latexOut, png, w, h, depth) Then Exit Sub

    If Not old Is Nothing Then
        Set target = old.Range
        old.Delete
        InsertPicture target, png, latexOut, w, h, depth
    ElseIf numbered Then
        InsertNumbered target, png, latexOut, w, h, depth
    Else
        target.Collapse 1
        InsertPicture target, png, latexOut, w, h, depth
    End If
    CleanFolder SessionFolder(png)
    Exit Sub
Failed:
    MsgBox T("MSG_ERROR") & Err.Description, vbExclamation, BAR_NAME
    CleanFolder SessionFolder(png)
End Sub

' Inserts the picture at the range and leaves the cursor right after it.
Private Sub InsertPicture(ByVal target As Range, ByVal png As String, ByVal latex As String, _
                          ByVal w As Single, ByVal h As Single, ByVal depth As Single)
    Dim shp As InlineShape
    Set shp = target.Document.InlineShapes.AddPicture(png, False, True, target)
    shp.LockAspectRatio = 0
    shp.Width = w
    shp.Height = h
    shp.AlternativeText = TAG & latex
    ' Lower the picture so the formula's baseline sits on the text line.
    shp.Range.Font.Position = -CLng(depth)
    shp.Range.Select
    Selection.Collapse 0
    Selection.Font.Position = 0
End Sub

' Display equation on its own line: centred, with "(n)" at the right margin.
Private Sub InsertNumbered(ByVal target As Range, ByVal png As String, ByVal latex As String, _
                           ByVal w As Single, ByVal h As Single, ByVal depth As Single)
    Dim usable As Single, splitAfter As Boolean
    target.Select
    With Selection
        .Collapse 1
        If .Start > .Paragraphs(1).Range.Start Then .TypeParagraph
        ' Text after the cursor moves to its own paragraph below the equation.
        splitAfter = (.Start < .Paragraphs(1).Range.End - 1)
        If splitAfter Then
            .TypeParagraph
            .MoveLeft 1, 1
        End If
        usable = .PageSetup.PageWidth - .PageSetup.LeftMargin - .PageSetup.RightMargin
        With .ParagraphFormat
            .Alignment = 0
            .TabStops.ClearAll
            .TabStops.Add Position:=usable / 2, Alignment:=1
            .TabStops.Add Position:=usable, Alignment:=2
        End With
        .TypeText vbTab
        InsertPicture .Range, png, latex, w, h, depth
        ' Type the brackets first, then put the number field between them.
        .TypeText vbTab & "()"
        .MoveLeft 1, 1
        .Fields.Add Range:=.Range, Type:=-1, Text:="SEQ Equation \* ARABIC", PreserveFormatting:=False
        .EndKey 5
        If splitAfter Then
            .MoveRight 1, 1
        Else
            .TypeParagraph
            .ParagraphFormat.TabStops.ClearAll
        End If
    End With
End Sub

' Opens the Vivian Math app and waits for the user to insert or cancel.
Private Function RunEditor(ByVal latexIn As String, ByVal fontSize As Single, ByRef latexOut As String, _
                           ByRef png As String, ByRef w As Single, ByRef h As Single, ByRef depth As Single) As Boolean
    Dim folder As String, parts() As String, started As Date
    RunEditor = False

    folder = Environ$("TEMP") & "\VivianMath"
    If Dir$(folder, vbDirectory) = "" Then MkDir folder
    Randomize
    folder = folder & "\" & Format$(Now, "yyyymmdd_hhnnss") & "_" & CStr(Int(Rnd * 100000))
    MkDir folder

    WriteUtf8 folder & "\latex.txt", latexIn
    WriteUtf8 folder & "\fontsize.txt", Replace(CStr(fontSize), ",", ".")

    On Error Resume Next
    Shell AppCommand() & " --word-session=""" & folder & """", vbNormalFocus
    If Err.Number <> 0 Then
        On Error GoTo 0
        MsgBox T("MSG_NO_APP"), vbExclamation, BAR_NAME
        Exit Function
    End If
    On Error GoTo 0

    started = Now
    Do
        DoEvents
        Sleep 150
        If Dir$(folder & "\done.flag") <> "" Then Exit Do
        If Dir$(folder & "\cancel.flag") <> "" Then
            CleanFolder folder
            Exit Function
        End If
        If DateDiff("s", started, Now) > WAIT_SECONDS Then Exit Function
    Loop

    latexOut = ReadUtf8(folder & "\result.txt")
    png = folder & "\result.png"
    parts = Split(ReadUtf8(folder & "\size.txt"), ";")
    w = Val(parts(0))
    h = Val(parts(1))
    depth = Val(parts(2))
    RunEditor = (w > 0 And h > 0)
End Function

' Folder that holds a session's result.png ("" when no session finished).
Private Function SessionFolder(ByVal png As String) As String
    SessionFolder = ""
    If InStrRev(png, "\") > 1 Then SessionFolder = Left$(png, InStrRev(png, "\") - 1)
End Function

' Removes a finished session folder from %TEMP%.
Private Sub CleanFolder(ByVal folder As String)
    If folder = "" Then Exit Sub
    On Error Resume Next
    Kill folder & "\*.*"
    RmDir folder
    On Error GoTo 0
End Sub

' Command line that starts the app, saved by the installer. Falls back to the default install path.
Private Function AppCommand() As String
    AppCommand = GetSetting("VivianMath", "Config", "Command", "")
    If AppCommand = "" Then
        AppCommand = """" & Environ$("LOCALAPPDATA") & "\Programs\vivian-math\Vivian Math.exe"""
    End If
End Function

Private Sub WriteUtf8(ByVal path As String, ByVal text As String)
    Dim st As Object
    Set st = CreateObject("ADODB.Stream")
    st.Type = 2
    st.Charset = "utf-8"
    st.Open
    ' WriteText fails with error 3001 on an empty string.
    If Len(text) > 0 Then st.WriteText text
    st.SaveToFile path, 2
    st.Close
End Sub

Private Function ReadUtf8(ByVal path As String) As String
    Dim st As Object
    Set st = CreateObject("ADODB.Stream")
    st.Type = 2
    st.Charset = "utf-8"
    st.Open
    st.LoadFromFile path
    ReadUtf8 = st.ReadText
    st.Close
End Function
