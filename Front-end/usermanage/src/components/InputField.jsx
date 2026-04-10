const InputField = ({ label, id, error, autoComplete, ...props }) => (
  <div className="mb-3">
    <label htmlFor={id} className="form-label fw-semibold">
      {label}
    </label>
    <input
      id={id}
      autoComplete={autoComplete || "off"}
      className={`form-control ${error ? "is-invalid" : ""}`}
      {...props}
    />
    {error && <div className="invalid-feedback">{error}</div>}
  </div>
);

export default InputField;
