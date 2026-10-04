import type { CSSProperties, ReactNode } from 'react';

interface Props<T extends string> {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
  style?: CSSProperties;
}

export function Segmented<T extends string>({ value, options, onChange, style }: Props<T>) {
  return (
    <div className="seg" style={style}>
      {options.map(o => (
        <button key={o.value} className={'sg' + (value === o.value ? ' on' : '')} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
