import { Outlet } from "react-router-dom";
import LandingHeader from "./LandingHeader.layout";
import LandingFooter from "./LandingFooter.layout";

const LandingLayout = () => {
  return (
    <div className="flex min-h-screen flex-col">
      <LandingHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <LandingFooter />
    </div>
  );
};

export default LandingLayout;
