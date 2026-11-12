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
' Batch mode renders many formulas at once without showing the editor:
'   Word writes  batch.txt, one "fontsize<TAB>latex" per line
'   App writes   r1.png, r2.png, ..., sizes.txt  then done.flag
' sizes.txt holds one "index;width;height;depth" per line; width 0 means the
' LaTeX could not be rendered.
'

Private Const TAG As String = "VivianMath:"
Private Const BAR_NAME As String = "Vivian Math"
Private Const WAIT_SECONDS As Long = 3600
Private Const FIGURE_MARK As String = "@figure:"

#If VBA7 Then
Private Declare PtrSafe Sub Sleep Lib "kernel32" (ByVal dwMilliseconds As Long)
#Else
Private Declare Sub Sleep Lib "kernel32" (ByVal dwMilliseconds As Long)
#End If

' Interface text is English on purpose: MsgBox uses the system ANSI code page and
' shows Vietnamese accented letters as "?" on many PCs.
Private Function T(ByVal key As String) As String
    If key = "CAP_INSERT" Then T = "Insert Equation"
    If key = "CAP_NUMBERED" Then T = "Insert Numbered Equation"
    If key = "CAP_EDIT" Then T = "Edit Equation"
    If key = "CAP_UPDATE" Then T = "Update Equation Numbers"
    If key = "CAP_TOGGLE" Then T = "Toggle TeX"
    If key = "CAP_FORMAT" Then T = "Format Equations"
    If key = "CAP_REF" Then T = "Insert Equation Reference"
    If key = "MSG_NO_TEX" Then T = "No LaTeX between dollar signs was found. Type a formula like $x^2+1$ and try again."
    If key = "MSG_FIGURE" Then T = "This picture is a figure, not an equation, so it has no LaTeX to show."
    If key = "MSG_NO_EQ" Then T = "There are no Vivian Math equations to format."
    If key = "ASK_SIZE" Then T = "Font size in points for the equations (6 to 96):"
    If key = "MSG_BAD_SIZE" Then T = "Enter a size between 6 and 96."
    If key = "ASK_REF" Then T = "Number of the equation to refer to:"
    If key = "MSG_NO_REF" Then T = "There is no numbered equation with that number. Click Update Equation Numbers and try again."
    If key = "MSG_BATCH_FAIL" Then T = "Vivian Math did not answer in time. Nothing was changed."
    If key = "MSG_NO_DOC" Then T = "Open a document first."
    If key = "MSG_SELECT" Then T = "No Vivian Math equation found here. Click an equation inserted with the Vivian Math buttons, then try again."
    If key = "MSG_NO_APP" Then T = "Could not start Vivian Math. Open the Vivian Math app and click the install-into-Word button again."
    If key = "MSG_ERROR" Then T = "Could not insert the equation: "
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
    AddButton bar, T("CAP_REF"), "VM_InsertReference"
    AddButton bar, T("CAP_TOGGLE"), "VM_ToggleTex"
    AddButton bar, T("CAP_FORMAT"), "VM_FormatEquations"
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
    Dim shp As InlineShape
    If Documents.Count = 0 Then
        MsgBox T("MSG_NO_DOC"), vbInformation, BAR_NAME
        Exit Sub
    End If
    Set shp = EquationToEdit()
    If shp Is Nothing Then
        MsgBox T("MSG_SELECT"), vbInformation, BAR_NAME
    Else
        DoInsert False, shp
    End If
End Sub

Public Sub VM_UpdateNumbers()
    If Documents.Count > 0 Then ActiveDocument.Fields.Update
End Sub

Private Function IsEquation(ByVal shp As InlineShape) As Boolean
    On Error Resume Next
    IsEquation = (Left$(shp.AlternativeText, Len(TAG)) = TAG)
End Function

' First Vivian Math equation inside the range, or Nothing.
Private Function FirstEquationIn(ByVal rng As Range) As InlineShape
    Dim shp As InlineShape
    Set FirstEquationIn = Nothing
    For Each shp In rng.InlineShapes
        If IsEquation(shp) Then
            Set FirstEquationIn = shp
            Exit Function
        End If
    Next shp
End Function

' The selected Vivian Math equation, or Nothing.
Private Function SelectedEquation() As InlineShape
    Set SelectedEquation = Nothing
    On Error Resume Next
    If Selection.InlineShapes.Count < 1 Then Exit Function
    Set SelectedEquation = FirstEquationIn(Selection.Range)
End Function

' The equation the user means to edit: the selected one, a floating one
' (wrapping changed by the user), the one touching the cursor, or the only
' one in the current paragraph.
Private Function EquationToEdit() As InlineShape
    Dim rng As Range, shp As InlineShape, found As InlineShape
    Dim i As Long, n As Long

    Set EquationToEdit = SelectedEquation()
    If Not EquationToEdit Is Nothing Then Exit Function

    On Error Resume Next
    n = 0
    n = Selection.ShapeRange.Count
    For i = 1 To n
        If Left$(Selection.ShapeRange(i).AlternativeText, Len(TAG)) = TAG Then
            Set EquationToEdit = Selection.ShapeRange(i).ConvertToInlineShape
            If Not EquationToEdit Is Nothing Then Exit Function
        End If
    Next i

    Set rng = Selection.Range
    rng.MoveStart 1, -1
    rng.MoveEnd 1, 1
    Set EquationToEdit = FirstEquationIn(rng)
    If Not EquationToEdit Is Nothing Then Exit Function

    n = 0
    For Each shp In Selection.Paragraphs(1).Range.InlineShapes
        If IsEquation(shp) Then
            n = n + 1
            Set found = shp
        End If
    Next shp
    If n = 1 Then Set EquationToEdit = found
End Function

Private Sub DoInsert(ByVal numbered As Boolean, Optional ByVal editShape As InlineShape = Nothing)
    Dim old As InlineShape, target As Range
    Dim latexIn As String, latexOut As String, png As String
    Dim fontSize As Single, w As Single, h As Single, depth As Single

    If Documents.Count = 0 Then
        MsgBox T("MSG_NO_DOC"), vbInformation, BAR_NAME
        Exit Sub
    End If
    On Error GoTo Failed

    Set old = editShape
    If old Is Nothing Then Set old = SelectedEquation()
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
    ' For a figure (graph, plane figure, solid) the app returns "@figure:" plus
    ' its settings instead of LaTeX, so Edit Equation reopens the same figure.
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

' Selected equation -> "$latex$" text. Otherwise every "$...$" in the selection
' (or in the whole document when nothing is selected) becomes an equation.
Public Sub VM_ToggleTex()
    Dim shp As InlineShape, rng As Range, src As String
    If Documents.Count = 0 Then
        MsgBox T("MSG_NO_DOC"), vbInformation, BAR_NAME
        Exit Sub
    End If
    On Error GoTo Failed
    Set shp = SelectedEquation()
    If Not shp Is Nothing Then
        src = Mid$(shp.AlternativeText, Len(TAG) + 1)
        If Left$(src, Len(FIGURE_MARK)) = FIGURE_MARK Then
            MsgBox T("MSG_FIGURE"), vbInformation, BAR_NAME
            Exit Sub
        End If
        Set rng = shp.Range
        shp.Delete
        rng.InsertAfter "$" & src & "$"
        rng.Font.Position = 0
        rng.Select
        Selection.Collapse 0
        Exit Sub
    End If
    ConvertTex
    Exit Sub
Failed:
    Application.ScreenUpdating = True
    MsgBox T("MSG_ERROR") & Err.Description, vbExclamation, BAR_NAME
End Sub

Private Sub ConvertTex()
    Dim scope As Range, rng As Range, r As Range
    Dim starts() As Long, ends() As Long, latex() As String, sizes() As Single
    Dim w() As Single, h() As Single, d() As Single
    Dim n As Long, i As Long, done As Long, body As String, folder As String
    Dim stopAt As Long, size As Single

    Set scope = ActiveDocument.Content
    If Selection.StoryType = 1 And Selection.End - Selection.Start > 1 Then Set scope = Selection.Range
    stopAt = scope.End

    Set rng = scope.Duplicate
    With rng.Find
        .ClearFormatting
        .Text = "$[!$^13]@$"
        .MatchWildcards = True
        .Forward = True
        .Wrap = 0
        .Format = False
    End With
    Do While rng.Find.Execute
        If rng.Start >= stopAt Or rng.End > stopAt Then Exit Do
        body = Mid$(rng.Text, 2, Len(rng.Text) - 2)
        ' "$5 and $10" is money, not a formula: LaTeX never has a space next to the dollar signs.
        If Len(Trim$(body)) > 0 And Left$(body, 1) <> " " And Right$(body, 1) <> " " Then
            ReDim Preserve starts(n)
            ReDim Preserve ends(n)
            ReDim Preserve latex(n)
            ReDim Preserve sizes(n)
            starts(n) = rng.Start
            ends(n) = rng.End
            latex(n) = body
            size = rng.Font.Size
            If size < 6 Or size > 96 Then size = 12
            sizes(n) = size
            n = n + 1
        End If
        rng.Collapse 0
    Loop
    If n = 0 Then
        MsgBox T("MSG_NO_TEX"), vbInformation, BAR_NAME
        Exit Sub
    End If

    If Not RunBatch(latex, sizes, n, folder, w, h, d) Then Exit Sub

    BeginUndo "Toggle TeX"
    Application.ScreenUpdating = False
    ' Work backwards so earlier positions stay valid.
    For i = n - 1 To 0 Step -1
        If w(i) > 0 And h(i) > 0 Then
            Set r = ActiveDocument.Range(starts(i), ends(i))
            r.Text = ""
            InsertPicture r, folder & "\r" & CStr(i + 1) & ".png", latex(i), w(i), h(i), d(i)
            done = done + 1
        End If
    Next i
    Application.ScreenUpdating = True
    EndUndo
    CleanFolder folder
    If done < n Then
        MsgBox CStr(done) & " formula(s) converted. " & CStr(n - done) & _
            " could not be read as LaTeX and were left as text.", vbInformation, BAR_NAME
    End If
End Sub

' Re-renders every equation (in the selection, or in the whole document) at one font size.
Public Sub VM_FormatEquations()
    Dim scope As Range, shp As InlineShape, answer As String, size As Single
    Dim spots() As Range, latex() As String, sizes() As Single
    Dim w() As Single, h() As Single, d() As Single
    Dim n As Long, i As Long, src As String, folder As String, r As Range

    If Documents.Count = 0 Then
        MsgBox T("MSG_NO_DOC"), vbInformation, BAR_NAME
        Exit Sub
    End If
    On Error GoTo Failed
    Set scope = ActiveDocument.Content
    If Selection.StoryType = 1 And Selection.End - Selection.Start > 1 Then Set scope = Selection.Range

    For Each shp In scope.InlineShapes
        If IsEquation(shp) Then
            src = Mid$(shp.AlternativeText, Len(TAG) + 1)
            If Left$(src, Len(FIGURE_MARK)) <> FIGURE_MARK And Len(src) > 0 Then
                ReDim Preserve spots(n)
                ReDim Preserve latex(n)
                Set spots(n) = shp.Range
                latex(n) = src
                n = n + 1
            End If
        End If
    Next shp
    If n = 0 Then
        MsgBox T("MSG_NO_EQ"), vbInformation, BAR_NAME
        Exit Sub
    End If

    answer = InputBox(T("ASK_SIZE"), BAR_NAME, "12")
    If answer = "" Then Exit Sub
    size = Val(Replace(answer, ",", "."))
    If size < 6 Or size > 96 Then
        MsgBox T("MSG_BAD_SIZE"), vbInformation, BAR_NAME
        Exit Sub
    End If
    ReDim sizes(n - 1)
    For i = 0 To n - 1
        sizes(i) = size
    Next i

    If Not RunBatch(latex, sizes, n, folder, w, h, d) Then Exit Sub

    BeginUndo "Format Equations"
    Application.ScreenUpdating = False
    For i = n - 1 To 0 Step -1
        If w(i) > 0 And h(i) > 0 Then
            Set r = spots(i)
            r.InlineShapes(1).Delete
            InsertPicture r, folder & "\r" & CStr(i + 1) & ".png", latex(i), w(i), h(i), d(i)
        End If
    Next i
    Application.ScreenUpdating = True
    EndUndo
    CleanFolder folder
    Exit Sub
Failed:
    Application.ScreenUpdating = True
    MsgBox T("MSG_ERROR") & Err.Description, vbExclamation, BAR_NAME
End Sub

' Inserts "(n)" that follows the number of a numbered equation when numbers change.
Public Sub VM_InsertReference()
    Dim answer As String, num As Long, fld As Field, target As Field, added As Field
    Dim here As Range, bm As Bookmark, bmName As String

    If Documents.Count = 0 Then
        MsgBox T("MSG_NO_DOC"), vbInformation, BAR_NAME
        Exit Sub
    End If
    On Error GoTo Failed
    answer = InputBox(T("ASK_REF"), BAR_NAME, "1")
    If answer = "" Then Exit Sub
    num = CLng(Val(answer))

    For Each fld In ActiveDocument.Fields
        If fld.Type = 12 Then
            If InStr(1, fld.Code.Text, "SEQ Equation", vbTextCompare) > 0 Then
                If CLng(Val(fld.Result.Text)) = num Then
                    Set target = fld
                    Exit For
                End If
            End If
        End If
    Next fld
    If target Is Nothing Then
        MsgBox T("MSG_NO_REF"), vbInformation, BAR_NAME
        Exit Sub
    End If

    BeginUndo "Insert Equation Reference"
    Set here = Selection.Range
    ' The reference points at a bookmark around the number field. Reuse it if it is already there.
    target.Select
    For Each bm In Selection.Bookmarks
        If Left$(bm.Name, 4) = "VMEq" Then bmName = bm.Name
    Next bm
    If bmName = "" Then
        Randomize
        bmName = "VMEq" & Format$(Now, "yymmddhhnnss") & CStr(Int(Rnd * 1000))
        ActiveDocument.Bookmarks.Add bmName, Selection.Range
    End If

    here.Select
    With Selection
        .Collapse 0
        .TypeText "()"
        .MoveLeft 1, 1
        Set added = .Fields.Add(Range:=.Range, Type:=-1, Text:="REF " & bmName & " \h", PreserveFormatting:=False)
        added.Select
        .Collapse 0
        .MoveRight 1, 1
    End With
    EndUndo
    Exit Sub
Failed:
    MsgBox T("MSG_ERROR") & Err.Description, vbExclamation, BAR_NAME
End Sub

' One undo step for a whole command (Word 2010 and later; ignored on Word 2007).
Private Sub BeginUndo(ByVal label As String)
    Dim wordApp As Object
    Set wordApp = Application
    On Error Resume Next
    wordApp.UndoRecord.StartCustomRecord label
End Sub

Private Sub EndUndo()
    Dim wordApp As Object
    Set wordApp = Application
    On Error Resume Next
    wordApp.UndoRecord.EndCustomRecord
End Sub

Private Function NewSessionFolder() As String
    Dim folder As String
    folder = Environ$("TEMP") & "\VivianMath"
    If Dir$(folder, vbDirectory) = "" Then MkDir folder
    Randomize
    folder = folder & "\" & Format$(Now, "yyyymmdd_hhnnss") & "_" & CStr(Int(Rnd * 100000))
    MkDir folder
    NewSessionFolder = folder
End Function

' Renders n formulas in the background. Arrays are 0-based; w(i) = 0 marks a formula that failed.
Private Function RunBatch(ByRef latex() As String, ByRef sizes() As Single, ByVal n As Long, ByRef folder As String, _
                          ByRef w() As Single, ByRef h() As Single, ByRef d() As Single) As Boolean
    Dim i As Long, k As Long, text As String, lines() As String, parts() As String, started As Date
    RunBatch = False

    folder = NewSessionFolder()
    For i = 0 To n - 1
        If i > 0 Then text = text & vbLf
        text = text & Replace(CStr(sizes(i)), ",", ".") & vbTab & Replace(Replace(latex(i), vbCr, " "), vbLf, " ")
    Next i
    WriteUtf8 folder & "\batch.txt", text

    Application.StatusBar = "Vivian Math is rendering " & CStr(n) & " formula(s)..."
    On Error Resume Next
    Shell AppCommand() & " --word-session=""" & folder & """", 6
    If Err.Number <> 0 Then
        On Error GoTo 0
        Application.StatusBar = False
        CleanFolder folder
        MsgBox T("MSG_NO_APP"), vbExclamation, BAR_NAME
        Exit Function
    End If
    On Error GoTo 0

    started = Now
    Do
        DoEvents
        Sleep 100
        If Dir$(folder & "\done.flag") <> "" Then Exit Do
        If Dir$(folder & "\cancel.flag") <> "" Or DateDiff("s", started, Now) > 120 + n * 2 Then
            Application.StatusBar = False
            CleanFolder folder
            MsgBox T("MSG_BATCH_FAIL"), vbExclamation, BAR_NAME
            Exit Function
        End If
    Loop
    Application.StatusBar = False

    ReDim w(n - 1)
    ReDim h(n - 1)
    ReDim d(n - 1)
    lines = Split(ReadUtf8(folder & "\sizes.txt"), vbLf)
    For i = 0 To UBound(lines)
        parts = Split(Trim$(lines(i)), ";")
        If UBound(parts) >= 3 Then
            k = CLng(Val(parts(0))) - 1
            If k >= 0 And k < n Then
                w(k) = Val(parts(1))
                h(k) = Val(parts(2))
                d(k) = Val(parts(3))
            End If
        End If
    Next i
    RunBatch = True
End Function

' Opens the Vivian Math app and waits for the user to insert or cancel.
Private Function RunEditor(ByVal latexIn As String, ByVal fontSize As Single, ByRef latexOut As String, _
                           ByRef png As String, ByRef w As Single, ByRef h As Single, ByRef depth As Single) As Boolean
    Dim folder As String, parts() As String, started As Date
    Static busy As Boolean
    RunEditor = False

    ' A button was clicked while an equation is still being edited:
    ' bring the open editor to the front instead of starting another one.
    If busy Then
        On Error Resume Next
        AppActivate "Vivian Math"
        On Error GoTo 0
        Exit Function
    End If

    folder = NewSessionFolder()

    WriteUtf8 folder & "\latex.txt", latexIn
    WriteUtf8 folder & "\fontsize.txt", Replace(CStr(fontSize), ",", ".")

    Application.StatusBar = "Opening Vivian Math..."
    On Error Resume Next
    Shell AppCommand() & " --word-session=""" & folder & """", vbNormalFocus
    If Err.Number <> 0 Then
        On Error GoTo 0
        Application.StatusBar = False
        MsgBox T("MSG_NO_APP"), vbExclamation, BAR_NAME
        Exit Function
    End If
    On Error GoTo 0

    busy = True
    started = Now
    Do
        DoEvents
        Sleep 150
        If Dir$(folder & "\done.flag") <> "" Then Exit Do
        If Dir$(folder & "\cancel.flag") <> "" Then
            CleanFolder folder
            busy = False
            Application.StatusBar = False
            Application.Activate
            Exit Function
        End If
        If DateDiff("s", started, Now) > WAIT_SECONDS Then
            busy = False
            Application.StatusBar = False
            Exit Function
        End If
    Loop
    busy = False
    Application.StatusBar = False
    Application.Activate

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
