import { useState } from "react";
import Login from "./components/Login.jsx";
import Projects from "./components/Projects.jsx";
import Workspace from "./components/Workspace.jsx";
import { currentUser, logout } from "./lib/store.js";

export default function App() {
  const [user, setUser] = useState(() => currentUser());
  const [project, setProject] = useState(null);

  if (!user) {
    return <Login onAuth={(u) => setUser(u)} />;
  }

  if (!project) {
    return (
      <Projects
        user={user}
        onOpen={(p) => setProject(p)}
        onLogout={() => { logout(); setUser(null); }}
      />
    );
  }

  return (
    <Workspace
      key={project.id}
      user={user}
      project={project}
      onBack={() => setProject(null)}
      onLogout={() => { logout(); setUser(null); setProject(null); }}
    />
  );
}
