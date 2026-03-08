import { Outlet } from "react-router-dom";
import LandingHeader from "./LandingHeader.layout";
import LandingFooter from "./LandingFooter.layout";
import ScrollToTopButton from "@/components/ui/ScrollToTopButton";

const LandingLayout = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <LandingHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <LandingFooter />
      <ScrollToTopButton />
    </div>
  );
};

export default LandingLayout;