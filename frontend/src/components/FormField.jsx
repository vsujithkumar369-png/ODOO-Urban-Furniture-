// FormField — reusable labeled input/select/textarea
export default function FormField({
  label, name, type = 'text', register, error,
  options, required, placeholder, className = '', ...rest
}) {
  const inputClass = `input ${error ? 'input-error' : ''} ${className}`;
  return (
    <div>
      {label && <label className="label" htmlFor={name}>{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>}
      {type === 'select' ? (
        <select id={name} className={inputClass} {...(register ? register(name) : {})} {...rest}>
          <option value="">Select...</option>
          {options?.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ) : type === 'textarea' ? (
        <textarea id={name} rows={3} className={inputClass} placeholder={placeholder} {...(register ? register(name) : {})} {...rest} />
      ) : (
        <input id={name} type={type} className={inputClass} placeholder={placeholder} {...(register ? register(name) : {})} {...rest} />
      )}
      {error && <p className="mt-1 text-xs text-red-500">{error.message}</p>}
    </div>
  );
}
