// pages/Unauthorized.jsx
import { Link } from "react-router-dom";

const Unauthorized = () => {
  return (
    <div className="min-vh-100 bg-light d-flex align-items-center justify-content-center">
      <div className="text-center">
        <h1 className="display-1 fw-bold text-danger">403</h1>
        <p className="fs-3">Access Denied</p>
        <p className="lead">You don't have permission to view this page.</p>
        <Link to="/" className="btn btn-primary">Go Home</Link>
      </div>
    </div>
  );
};

export default Unauthorized;