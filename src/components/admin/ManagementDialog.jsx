import { useEffect, useRef } from 'react'
import AdminIcon from './AdminIcon'
export default function ManagementDialog({ title, children, onClose }) {
  const ref = useRef(null)
  useEffect(() => {
    const previous = document.activeElement
    const dialog = ref.current
    dialog.showModal()
    return () => { dialog.close(); if (previous?.isConnected) previous.focus() }
  }, [])
  return <dialog ref={ref} className="admin-drawer ops-management-dialog" aria-labelledby="management-title" onCancel={(event) => { event.preventDefault(); onClose() }}><header className="ops-drawer-header"><h2 id="management-title">{title}</h2><button className="ops-icon-button" aria-label={`Close ${title}`} onClick={onClose}><AdminIcon name="close" /></button></header><div className="ops-drawer-content">{children}</div></dialog>
}
