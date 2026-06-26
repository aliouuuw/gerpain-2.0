import { useId } from 'react'

import { parseXofInput } from '#/lib/format-money'

export type PriceInputProps = {
  value: string
  onChange: (value: string) => void
  id?: string
  required?: boolean
  disabled?: boolean
  placeholder?: string
}

export function PriceInput({
  value,
  onChange,
  id,
  required,
  disabled,
  placeholder = '0',
}: PriceInputProps) {
  const autoId = useId()
  const inputId = id ?? autoId

  return (
    <div className="price-input">
      <input
        id={inputId}
        type="text"
        inputMode="numeric"
        className="price-input__field"
        value={value}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange(parseXofInput(e.target.value))}
      />
      <span className="price-input__suffix" aria-hidden>
        FCFA
      </span>
    </div>
  )
}
