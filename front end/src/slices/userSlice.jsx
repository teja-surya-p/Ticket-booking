import "./userSlice.module.css";
export const initialUserState = {
  currentUser: null,
  isAuthenticated: false
};
export function setUser(user) {
  return {
    currentUser: user,
    isAuthenticated: true
  };
}
export function clearUser() {
  return initialUserState;
}
