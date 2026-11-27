export default function BrandMark({ size = 34, className = '', label = 'AMAN FORGE' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      role="img"
      aria-label={label}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="1" y="1" width="62" height="62" rx="18" fill="#0B120E" />
      <rect x="1.5" y="1.5" width="61" height="61" rx="17.5" stroke="#DDE7DC" strokeOpacity=".13" />
      <path d="M10 49.5 27.7 13.2c.8-1.7 1.8-2.5 3.3-2.5h2c1.5 0 2.5.8 3.3 2.5L54 49.5H42.7L32 26.4 21.2 49.5H10Z" fill="#E9EEE5"/>
      <path d="M25.6 41.2h12.8l4.2 8.3H21.4l4.2-8.3Z" fill="#0B120E"/>
      <path d="m13.6 52 33.1-22.5 5.7 6.8L18.6 57l-5-5Z" fill="#9CE878"/>
      <path d="m42.5 32.4 4.2-2.9 5.7 6.8-4.3 2.8-5.6-6.7Z" fill="#D7FF9E"/>
      <path d="m27.7 13.2 4.4 9.3 4.2-9.3c-.8-1.7-1.8-2.5-3.3-2.5h-2c-1.5 0-2.5.8-3.3 2.5Z" fill="#B5F18C"/>
    </svg>
  );
}
