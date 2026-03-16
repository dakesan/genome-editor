interface LoadingOverlayProps {
  message: string;
}

export function LoadingOverlay({ message }: LoadingOverlayProps) {
  return (
    <div className="loading-overlay">
      <div className="loading-spinner" />
      <span>{message}</span>
    </div>
  );
}
