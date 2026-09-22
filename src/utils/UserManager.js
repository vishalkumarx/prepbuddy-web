export const UserManager = {
  getUserId: () => {
    let id = localStorage.getItem('user_id');
    if (!id) {
      id = 'user_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('user_id', id);
    }
    return id;
  },

  setUserId: (id) => {
    localStorage.setItem('user_id', id);
  },

  getEmail: () => {
    return localStorage.getItem('email');
  },

  setEmail: (email) => {
    localStorage.setItem('email', email);
  },

  isAdmin: () => {
    const email = localStorage.getItem('email');
    return email && email.toLowerCase() === 'vvishalkkumar19@gmail.com';
  },

  getUsername: () => {
    return localStorage.getItem('username');
  },

  setUsername: (username) => {
    localStorage.setItem('username', username);
  },

  getAvatar: () => {
    return localStorage.getItem('avatar');
  },

  setAvatar: (avatar) => {
    if (avatar) {
      localStorage.setItem('avatar', avatar);
    } else {
      localStorage.removeItem('avatar');
    }
  },

  isLoggedIn: () => {
    return !!localStorage.getItem('username');
  },

  getPreparation: () => {
    return localStorage.getItem('preparation_mode'); // 'upsc' | 'state_gov' | null
  },

  setPreparation: (mode) => {
    localStorage.setItem('preparation_mode', mode);
  },

  clearPreparation: () => {
    localStorage.removeItem('preparation_mode');
  },

  logout: () => {
    localStorage.removeItem('username');
    localStorage.removeItem('user_id');
    localStorage.removeItem('email');
    localStorage.removeItem('avatar');
    localStorage.removeItem('preparation_mode');
  }
};
