import { useToast } from '../store/toast';

export function ToastView() {
  const toast = useToast(s => s.toast);
  if (!toast) return null;
  return (
    <div className="toast" key={toast.id}>
      <span className="dot" style={{ width: 8, height: 8, background: toast.color }} />
      <span className="ell" style={{ minWidth: 0 }}>{toast.text}</span>
    </div>
  );
}
