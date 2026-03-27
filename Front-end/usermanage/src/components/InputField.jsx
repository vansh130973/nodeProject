const InputField = ({ label, id, error, ...props }) => (
  <div className="mb-3">
    <label htmlFor={id} className="form-label fw-semibold">
      {label}
    </label>
    <input
      id={id}
      className={`form-control ${error ? "is-invalid" : ""}`}
      {...props}
    />
    {error && <div className="invalid-feedback">{error}</div>}
  </div>
);

export default InputField;
