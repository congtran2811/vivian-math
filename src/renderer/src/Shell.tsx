import { useEffect, useState } from 'react'
import App from './App'
import Shapes3D from './shapes3d/Shapes3D'
import Graphs from './graphs/Graphs'
import Plane from './plane/Plane'
import { parseFigure, type FigureSource } from './WordInsert'

type View = 'editor' | 'graphs' | 'plane' | 'shapes'

const VIEWS: { id: View; name: string }[] = [
  { id: 'editor', name: 'Công thức' },
  { id: 'graphs', name: 'Đồ thị' },
  { id: 'plane', name: 'Hình phẳng' },
  { id: 'shapes', name: 'Hình 3D' }
]

/** Khung ngoài: chuyển giữa các phần. Các phần luôn được giữ để không mất nội dung đang soạn. */
export default function Shell(): JSX.Element {
  const [view, setView] = useState<View>('editor')
  // Word gửi công thức tới: chuyển về phần soạn công thức.
  const [word, setWord] = useState(false)
  // Hình mà Word yêu cầu mở lại để sửa; mỗi lần là một đối tượng mới để phần tương ứng nạp lại.
  const [figure, setFigure] = useState<FigureSource | null>(null)
  useEffect(() => {
    const apply = (session: { latex: string } | null): void => {
      setWord(!!session)
      if (!session) return
      const fig = parseFigure(session.latex)
      setFigure(fig)
      // Sửa hình nào thì mở đúng phần của hình đó; công thức thì về phần soạn công thức.
      setView(fig ? fig.view : 'editor')
    }
    void window.vivian?.wordSession?.().then((session) => session && apply(session))
    window.vivian?.onWordSession?.(apply)
  }, [])
  const restore = (v: View): unknown => (figure && figure.view === v ? figure.state : undefined)
  return (
    <>
      <nav className="views">
        {VIEWS.map((v) => (
          <button key={v.id} className={v.id === view ? 'active' : ''} onClick={() => setView(v.id)}>
            {v.name}
          </button>
        ))}
      </nav>
      <div hidden={view !== 'editor'}>
        <App />
      </div>
      <div hidden={view !== 'graphs'}>
        <Graphs word={word} restore={restore('graphs')} />
      </div>
      <div hidden={view !== 'plane'}>
        <Plane word={word} restore={restore('plane')} />
      </div>
      <div hidden={view !== 'shapes'}>
        <Shapes3D active={view === 'shapes'} word={word} restore={restore('shapes')} />
      </div>
    </>
  )
}
