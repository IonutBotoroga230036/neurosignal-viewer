import { useState } from "react";
import { listProjects, createProject, deleteProject } from "../lib/store.js";

export default function Projects({ user, onOpen, onLogout }) {
  const [projects, setProjects] = useState(() => listProjects(user));
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const refresh = () => setProjects(listProjects(user));

  const create = () => {
    if (!name.trim()) return;
    const p = createProject(user, name);
    setName("");
    setCreating(false);
    refresh();
    onOpen(p);
  };

  const remove = (id) => {
    if (!confirm("Delete this project? Imported files for it stay in the browser cache.")) return;
    deleteProject(user, id);
    refresh();
  };

  return (
    <div className="mx-auto flex h-screen max-w-2xl flex-col gap-6 px-6 py-10 text-bone-100">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="font-mono text-[10px] uppercase tracking-widest text-bone-500">
            signed in as {user}
          </p>
        </div>
        <button
          onClick={onLogout}
          className="font-mono text-[11px] text-bone-500 transition hover:text-bone-300"
        >
          log out
        </button>
      </div>

      {projects.length === 0 && !creating && (
        <div className="rounded border border-dashed border-ink-600 px-6 py-12 text-center">
          <p className="mb-3 font-mono text-sm text-bone-500">no projects yet</p>
          <button
            onClick={() => setCreating(true)}
            className="rounded bg-bone-100 px-4 py-2 font-mono text-sm text-ink-900 transition hover:bg-bone-300"
          >
            create your first project
          </button>
        </div>
      )}

      {projects.length > 0 && (
        <ul className="space-y-2">
          {projects.map((p) => (
            <li
              key={p.id}
              className="group flex items-center justify-between rounded border border-ink-700 bg-ink-850 px-4 py-3 transition hover:border-ink-500"
            >
              <button onClick={() => onOpen(p)} className="flex-1 text-left">
                <div className="font-display text-sm text-bone-100">{p.name}</div>
                <div className="font-mono text-[10px] text-bone-500">
                  {p.participants.length} participant{p.participants.length === 1 ? "" : "s"}
                </div>
              </button>
              <button
                onClick={() => remove(p.id)}
                className="font-mono text-[11px] text-bone-500 opacity-0 transition hover:text-[#d98a8a] group-hover:opacity-100"
              >
                delete
              </button>
            </li>
          ))}
        </ul>
      )}

      {(creating || projects.length > 0) && (
        <div className="flex gap-2">
          <input
            placeholder="new project name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
            className="flex-1 rounded border border-ink-600 bg-ink-850 px-3 py-2 font-mono text-sm text-bone-100 focus:border-bone-500 focus:outline-none"
          />
          <button
            onClick={create}
            className="rounded border border-ink-600 px-4 py-2 font-mono text-sm text-bone-300 transition hover:border-bone-500 hover:text-bone-100"
          >
            create
          </button>
        </div>
      )}
    </div>
  );
}
