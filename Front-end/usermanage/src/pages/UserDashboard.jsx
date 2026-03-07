import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const UserDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) navigate("/login");
  }, [user, navigate]);

  const profileFields = [
    ["First Name", user?.firstName],
    ["Last Name", user?.lastName],
    ["Username", user?.userName],
    ["Email", user?.email],
    ["Phone", user?.phone],
  ];

  return (
    <div className="min-vh-100 bg-light">
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-md-6">
            <div className="card border-0 shadow-sm rounded-3">
              <div className="card-header bg-white border-bottom fw-semibold">
                Your Profile
              </div>
              <div className="card-body">
                <dl className="row mb-0">
                  {profileFields.map(([label, value]) => (
                    <>
                      <dt key={label + "-label"} className="col-5 text-muted fw-normal small">
                        {label}
                      </dt>
                      <dd key={label + "-value"} className="col-7 fw-semibold">
                        {value ?? "—"}
                      </dd>
                    </>
                  ))}
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;