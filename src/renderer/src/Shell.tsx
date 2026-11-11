import { useState } from 'react'
import App from './App'
import Shapes3D from './shapes3d/Shapes3D'

type View = 'editor' | 'shapes'

const VIEWS: { id: View; name: string }[] = [
  { id: 'editor', name: 'Công thức' },
  { id: 'shapes', name: 'Hình 3D' }
]

/** Khung ngoài: chuyển giữa các phần. Các phần luôn được giữ để không mất nội dung đang soạn. */
export default function Shell(): JSX.Element {
  const [view, setView] = useState<View>('editor')
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
      <div hidden={view !== 'shapes'}>
        <Shapes3D active={view === 'shapes'} />
      </div>
    </>
  )
}
