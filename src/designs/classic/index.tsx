import type { PreparedDesignRouteProps as DesignRouteProps } from "@/designs/shell-props";

import AboutRoute from "./about-route";
import ContactRoute from "./contact-route";
import HomeRoute from "./home-route";
import InterviewMapRoute from "./interview-map-route";
import JourneyRoute from "./journey-route";
import ProjectDetailRoute from "./project-detail-route";
import ProjectsRoute from "./projects-route";
import ResumeRoute from "./resume-route";

export default function ClassicRoute(props: DesignRouteProps) {
  switch (props.route) {
    case "home":
      return <HomeRoute {...props} />;
    case "projects":
      return <ProjectsRoute {...props} />;
    case "project-detail":
      return <ProjectDetailRoute {...props} />;
    case "about":
      return <AboutRoute {...props} />;
    case "resume":
      return <ResumeRoute {...props} />;
    case "contact":
      return <ContactRoute {...props} />;
    case "journey":
      return <JourneyRoute {...props} />;
    case "interview-map":
      return <InterviewMapRoute {...props} />;
  }
}
