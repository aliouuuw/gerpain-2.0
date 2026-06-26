export interface AvatarProps {
  initials: string;
  src?: string;
  size?: number;
}

export function Avatar({ initials, src, size = 32 }: AvatarProps) {
  return (
    <div
      className="avatar"
      style={{ width: size, height: size, fontSize: size * 0.375 }}
      aria-hidden="true"
    >
      {src ? <img src={src} alt={initials} /> : initials}
    </div>
  );
}
