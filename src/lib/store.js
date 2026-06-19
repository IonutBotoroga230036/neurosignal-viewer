// Simple local persistence for accounts + projects.
//
// THIS IS FOR TESTING ONLY. Passwords are stored in plaintext in localStorage.
// The migration path is a real backend (FastAPI) with RBAC and a SQL database;
// every function here maps to an endpoint you can swap in later without the UI
// changing. File blobs are kept in IndexedDB (see idb.js), not here.

const USERS_KEY = "ns_users";
const SESSION_KEY = "ns_session";
const projectsKey = (user) => `ns_projects_${user}`;

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

// --- accounts ------------------------------------------------------------

export function signup(username, password) {
  username = username.trim();
  if (!username) throw new Error("Username required.");
  const users = read(USERS_KEY, {});
  if (users[username]) throw new Error("That username already exists.");
  users[username] = { password, createdAt: Date.now() };
  write(USERS_KEY, users);
  write(SESSION_KEY, username);
  return username;
}

export function login(username, password) {
  username = username.trim();
  const users = read(USERS_KEY, {});
  const u = users[username];
  if (!u || u.password !== password) throw new Error("Wrong username or password.");
  write(SESSION_KEY, username);
  return username;
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

export function currentUser() {
  return read(SESSION_KEY, null);
}

// --- projects ------------------------------------------------------------

export function listProjects(user) {
  return read(projectsKey(user), []);
}

export function createProject(user, name) {
  name = (name || "").trim();
  if (!name) throw new Error("Project name required.");
  const projects = listProjects(user);
  const project = {
    id: uid(),
    name,
    createdAt: Date.now(),
    participants: [], // { id, name, fileName, blobKey }
    pipeline: null,   // project-wide default; null = none yet
  };
  projects.push(project);
  write(projectsKey(user), projects);
  return project;
}

export function deleteProject(user, projectId) {
  write(projectsKey(user), listProjects(user).filter((p) => p.id !== projectId));
}

export function getProject(user, projectId) {
  return listProjects(user).find((p) => p.id === projectId) || null;
}

export function saveProject(user, project) {
  const projects = listProjects(user).map((p) => (p.id === project.id ? project : p));
  write(projectsKey(user), projects);
}

export function newParticipantId() {
  return uid();
}
