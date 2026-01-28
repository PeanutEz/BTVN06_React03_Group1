import { Route } from "react-router-dom";
import ClientLayout from "../../layouts/client/Client.layout";
import ClientGuard from "../guard/ClientGuard";
import { CLIENT_MENU } from "./Client.menu";

export const ClientRoutes = (
  <Route element={<ClientGuard />}>
    <Route element={<ClientLayout />}>
      {CLIENT_MENU.map((item) => (
        <Route key={item.path} path={item.path} element={<item.component />} />
      ))}
    </Route>
  </Route>
);
