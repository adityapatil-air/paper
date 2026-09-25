// Mock data for the research paper review platform

const getApiBaseUrl = () => {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL;
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:4000';
  }
  return '';
};
const API_BASE_URL = getApiBaseUrl();

// Backend-issued JWT (from /api/auth/login), sent on every signed-in request.
const AUTH_TOKEN_KEY = 'authToken';
export const authHeaders = () => {
  try {
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch (e) {
    return {};
  }
};
const readJson = async (response) => {
  try {
    return await response.json();
  } catch (e) {
    return {};
  }
};

const fetchWithTimeout = async (url, options = {}, timeoutMs = 15000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(id);
  }
};

export const mockAPI = {
  // Authentication
  login: async (email, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();

      if (!data.success || !data.user) {
        return { success: false, error: data.error || 'Invalid credentials' };
      }

      return { success: true, user: data.user, token: data.token || null };
    } catch (error) {
      console.error('login error', error);
      return { success: false, error: 'Login failed. Please try again.' };
    }
  },

  register: async (userData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      const data = await response.json();

      if (!data.success || !data.user) {
        return { success: false, error: data.error || 'Registration failed. Please try again.' };
      }

      return { success: true, user: data.user, token: data.token || null };
    } catch (error) {
      console.error('register error', error);
      return { success: false, error: 'Registration failed. Please try again.' };
    }
  },

  // Papers
  getPublishedPapers: async () => {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/papers/published`);
      const data = await response.json();

      if (!data.success || !Array.isArray(data.papers)) {
        return [];
      }

      return data.papers;
    } catch (error) {
      console.error('getPublishedPapers error', error);
      return [];
    }
  },

  getIssueAssignments: async () => {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/issues/assignments`);
      const data = await response.json();

      if (!data.success || !Array.isArray(data.assignments)) {
        return [];
      }

      return data.assignments;
    } catch (error) {
      console.error('getIssueAssignments error', error);
      return [];
    }
  },

  // Papers visible to the signed-in user (admin: all, author: own, reviewer: assigned).
  // Throws on failure so dashboards can show an error instead of an empty list.
  getAllPapers: async () => {
    const response = await fetch(`${API_BASE_URL}/api/papers`, { headers: authHeaders() });
    const data = await readJson(response);

    if (!response.ok || !data.success || !Array.isArray(data.papers)) {
      throw new Error(data.error || 'Failed to load papers.');
    }

    return data.papers;
  },

  getPaperById: async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/papers/${id}`, { headers: authHeaders() });
      const data = await readJson(response);

      if (!data.success) {
        return null;
      }

      return data.paper || null;
    } catch (error) {
      console.error('getPaperById error', error);
      return null;
    }
  },

  submitPaper: async (paperData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/papers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(paperData)
      });
      const data = await response.json();

      if (!data.success || !data.paper) {
        return { success: false, error: data.error || 'Failed to submit paper.' };
      }

      return { success: true, paper: data.paper };
    } catch (error) {
      console.error('submitPaper error', error);
      return { success: false, error: 'Failed to submit paper.' };
    }
  },

  uploadRevision: async (paperId, userId, file) => {
    try {
      const formData = new FormData();
      formData.append('manuscript', file);
      if (userId) {
        formData.append('userId', String(userId));
      }

      const response = await fetch(`${API_BASE_URL}/api/submissions/${paperId}/revision`, {
        method: 'POST',
        headers: authHeaders(),
        body: formData,
      });
      const data = await readJson(response);

      if (!response.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to upload revised manuscript.' };
      }

      return { success: true, manuscriptUrl: data.manuscriptUrl };
    } catch (error) {
      console.error('uploadRevision error', error);
      return { success: false, error: 'Failed to upload revised manuscript.' };
    }
  },

  submitFullPaper: async (payload) => {
    try {
      const formData = new FormData();
      formData.append('fullName', payload.fullName || '');
      formData.append('email', payload.email || '');
      formData.append('affiliation', payload.affiliation || '');
      formData.append('paperTitle', payload.paperTitle || '');
      formData.append('keywords', payload.keywords || '');
      formData.append('abstract', payload.abstract || '');
      formData.append('comments', payload.comments || '');

      if (Array.isArray(payload.coAuthors)) {
        formData.append('coAuthors', JSON.stringify(payload.coAuthors));
      }
      if (payload.userId) {
        formData.append('userId', String(payload.userId));
      }

      if (payload.manuscriptFile) {
        formData.append('manuscript', payload.manuscriptFile);
      }
      if (payload.copyrightFile) {
        formData.append('copyrightForm', payload.copyrightFile);
      }

      const response = await fetch(`${API_BASE_URL}/api/submissions`, {
        method: 'POST',
        headers: authHeaders(),
        body: formData,
      });

      let data = null;
      try {
        data = await response.json();
      } catch (_jsonErr) {
        const raw = await response.text().catch(() => '');
        const status = response.status;
        const fallbackMessage = status === 413
          ? 'Upload too large. Please upload a smaller file.'
          : 'Server returned an unexpected response.';
        return { success: false, error: raw ? `${fallbackMessage}` : fallbackMessage };
      }

      if (!response.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to submit paper.' };
      }

      return { success: true, paper: data.paper };
    } catch (error) {
      console.error('submitFullPaper error', error);
      return { success: false, error: 'Failed to submit paper.' };
    }
  },

  adminReplacePaperFiles: async (paperId, files) => {
    try {
      const formData = new FormData();
      if (files?.manuscriptFile) {
        formData.append('manuscript', files.manuscriptFile);
      }
      if (files?.copyrightFile) {
        formData.append('copyrightForm', files.copyrightFile);
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/papers/${paperId}/files`, {
        method: 'POST',
        headers: authHeaders(),
        body: formData,
      });
      const data = await readJson(response);

      if (!response.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to update paper files.' };
      }

      return { success: true, manuscriptUrl: data.manuscriptUrl || null, copyrightUrl: data.copyrightUrl || null };
    } catch (error) {
      console.error('adminReplacePaperFiles error', error);
      return { success: false, error: 'Failed to update paper files.' };
    }
  },

  // Reviews
  getReviewsByReviewer: async (reviewerId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/reviews/reviewer/${reviewerId}`, { headers: authHeaders() });
      const data = await readJson(response);

      if (!data.success || !Array.isArray(data.reviews)) {
        return [];
      }

      return data.reviews;
    } catch (error) {
      console.error('getReviewsByReviewer error', error);
      return [];
    }
  },

  getReviewsByPaper: async (paperId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/reviews/paper/${paperId}`, { headers: authHeaders() });
      const data = await readJson(response);

      if (!data.success || !Array.isArray(data.reviews)) {
        return [];
      }

      return data.reviews;
    } catch (error) {
      console.error('getReviewsByPaper error', error);
      return [];
    }
  },

  // Every review, for the admin dashboard (admins only).
  getAllReviews: async () => {
    const response = await fetch(`${API_BASE_URL}/api/reviews`, { headers: authHeaders() });
    const data = await readJson(response);
    if (!response.ok || !data.success || !Array.isArray(data.reviews)) {
      throw new Error(data.error || 'Failed to load reviews.');
    }
    return data.reviews;
  },

  // Reviewer comments on the signed-in author's own paper (no reviewer identities).
  getReviewsForAuthor: async (paperId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/reviews/paper/${paperId}/for-author`, { headers: authHeaders() });
      const data = await readJson(response);
      if (!response.ok || !data.success || !Array.isArray(data.reviews)) {
        return { success: false, error: data.error || 'Failed to load reviewer comments.' };
      }
      return { success: true, reviews: data.reviews };
    } catch (error) {
      console.error('getReviewsForAuthor error', error);
      return { success: false, error: 'Failed to load reviewer comments.' };
    }
  },

  submitReview: async (reviewData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(reviewData),
      });

      const data = await readJson(response);

      if (!response.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to submit review.' };
      }

      return { success: true, review: data.review };
    } catch (error) {
      console.error('submitReview error', error);
      return { success: false, error: 'Failed to submit review.' };
    }
  },

  getIssues: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/issues`);
      const data = await response.json();

      if (!data.success || !Array.isArray(data.issues)) {
        return [];
      }

      return data.issues;
    } catch (error) {
      console.error('getIssues error', error);
      return [];
    }
  },

  getIssuePapers: async (issueId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/issues/${issueId}/papers`);
      const data = await response.json();

      if (!data.success || !Array.isArray(data.papers)) {
        return [];
      }

      return data.papers;
    } catch (error) {
      console.error('getIssuePapers error', error);
      return [];
    }
  },

  // issueData: FormData (text fields + optional `file` / `coverImage`) or a plain object.
  createIssue: async (issueData) => {
    try {
      const isForm = typeof FormData !== 'undefined' && issueData instanceof FormData;
      const response = await fetch(`${API_BASE_URL}/api/issues`, {
        method: 'POST',
        headers: isForm ? authHeaders() : { 'Content-Type': 'application/json', ...authHeaders() },
        body: isForm ? issueData : JSON.stringify(issueData),
      });
      const data = await readJson(response);

      if (!response.ok || !data.success || !data.issue) {
        return { success: false, error: data.error || 'Failed to create issue.', code: data.code };
      }

      return { success: true, issue: data.issue };
    } catch (error) {
      console.error('createIssue error', error);
      return { success: false, error: 'Failed to create issue.' };
    }
  },

  updateIssue: async (issueId, formData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/issues/${issueId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: formData,
      });
      const data = await readJson(response);

      if (!response.ok || !data.success || !data.issue) {
        return { success: false, error: data.error || 'Failed to update issue.', code: data.code };
      }

      return { success: true, issue: data.issue };
    } catch (error) {
      console.error('updateIssue error', error);
      return { success: false, error: 'Failed to update issue.' };
    }
  },

  setCurrentIssue: async (issueId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/issues/${issueId}/set-current`, {
        method: 'POST',
        headers: authHeaders(),
      });
      const data = await response.json();

      if (!data.success || !data.issue) {
        return { success: false, error: data.error || 'Failed to update current issue.' };
      }

      return { success: true, issue: data.issue };
    } catch (error) {
      console.error('setCurrentIssue error', error);
      return { success: false, error: 'Failed to update current issue.' };
    }
  },

  deleteIssue: async (issueId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/issues/${issueId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const data = await response.json();

      if (!data.success) {
        return { success: false, error: data.error || 'Failed to delete issue.' };
      }

      return { success: true };
    } catch (error) {
      console.error('deleteIssue error', error);
      return { success: false, error: 'Failed to delete issue.' };
    }
  },

  assignPaperToIssue: async (paperId, issueId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/issues/${issueId}/assign-paper`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ paperId }),
      });
      const data = await response.json();

      if (!data.success) {
        return { success: false, error: data.error || 'Failed to assign paper to issue.' };
      }

      return { success: true };
    } catch (error) {
      console.error('assignPaperToIssue error', error);
      return { success: false, error: 'Failed to assign paper to issue.' };
    }
  },

  unassignPaperFromIssue: async (paperId, issueId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/issues/${issueId}/assign-paper/${paperId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const data = await response.json();

      if (!data.success) {
        return { success: false, error: data.error || 'Failed to unassign paper from issue.' };
      }

      return { success: true };
    } catch (error) {
      console.error('unassignPaperFromIssue error', error);
      return { success: false, error: 'Failed to unassign paper from issue.' };
    }
  },

  // Notifications
  getNotifications: async (userId) => {
    try {
      // The server returns the signed-in user's notifications (the token decides, not userId).
      const response = await fetch(`${API_BASE_URL}/api/notifications`, { headers: authHeaders() });
      const data = await readJson(response);

      if (!data.success || !Array.isArray(data.notifications)) {
        return [];
      }

      return data.notifications;
    } catch (error) {
      console.error('getNotifications error', error);
      return [];
    }
  },

  markNotificationRead: async (notificationId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications/${notificationId}/read`, {
        method: 'POST',
        headers: authHeaders(),
      });
      const data = await readJson(response);

      if (!data.success) {
        return { success: false };
      }

      return { success: true };
    } catch (error) {
      console.error('markNotificationRead error', error);
      return { success: false };
    }
  },

  deleteNotification: async (notificationId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const data = await readJson(response);

      if (!data.success) {
        return { success: false };
      }

      return { success: true };
    } catch (error) {
      console.error('deleteNotification error', error);
      return { success: false };
    }
  },

  // Payments
  // The server sets the amount from the currency; the client never sends an amount.
  createPaymentOrder: async (paperId, currency) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/payments/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ paperId, currency })
      });
      const data = await response.json();

      if (!data.success || !data.order) {
        return { success: false, error: data.error || 'Failed to create payment order.' };
      }

      return { success: true, order: data.order };
    } catch (error) {
      console.error('createPaymentOrder error', error);
      return { success: false, error: 'Failed to create payment order.' };
    }
  },

  verifyPayment: async (paymentData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/payments/verify-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(paymentData)
      });
      const data = await response.json();

      if (!data.success) {
        return { success: false, error: data.error || data.message || 'Payment verification failed.' };
      }

      return { success: true };
    } catch (error) {
      console.error('verifyPayment error', error);
      return { success: false, error: 'Payment verification failed.' };
    }
  },

  // { configured, key, fees: { INR, USD } }
  getPaymentConfig: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/payments/key`);
      const data = await response.json();
      return { configured: Boolean(data.configured && data.key), key: data.key || null, fees: data.fees || { INR: 1500, USD: 50 } };
    } catch (error) {
      console.error('getPaymentConfig error', error);
      return { configured: false, key: null, fees: { INR: 1500, USD: 50 } };
    }
  },

  uploadCopyrightForm: async (paperId, file) => {
    try {
      const formData = new FormData();
      formData.append('copyrightForm', file);
      const response = await fetch(`${API_BASE_URL}/api/submissions/${paperId}/copyright`, {
        method: 'POST',
        headers: authHeaders(),
        body: formData,
      });
      const data = await readJson(response);
      if (!response.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to upload the copyright form.' };
      }
      return { success: true, copyrightUrl: data.copyrightUrl };
    } catch (error) {
      console.error('uploadCopyrightForm error', error);
      return { success: false, error: 'Failed to upload the copyright form.' };
    }
  },

  getImportantDates: async () => {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/settings/important-dates`);
      const data = await response.json();

      if (!data.success) {
        return { success: false, error: data.error || 'Failed to load important dates.' };
      }

      return { success: true, dates: data.dates || null };
    } catch (error) {
      console.error('getImportantDates error', error);
      return { success: false, error: 'Failed to load important dates.' };
    }
  },

  saveImportantDates: async (dates) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/settings/important-dates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ dates }),
      });
      const data = await readJson(response);

      if (!response.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to save important dates.' };
      }

      return { success: true };
    } catch (error) {
      console.error('saveImportantDates error', error);
      return { success: false, error: 'Failed to save important dates.' };
    }
  },

  getEditorialBoard: async () => {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/settings/editorial-board`);
      const data = await response.json();

      if (!data.success) {
        return { success: false, error: data.error || 'Failed to load editorial board.' };
      }

      return { success: true, board: data.board || null };
    } catch (error) {
      console.error('getEditorialBoard error', error);
      return { success: false, error: 'Failed to load editorial board.' };
    }
  },

  saveEditorialBoard: async (board) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/settings/editorial-board`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ board }),
      });
      const data = await readJson(response);

      if (!response.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to save editorial board.' };
      }

      return { success: true, board: data.board || null };
    } catch (error) {
      console.error('saveEditorialBoard error', error);
      return { success: false, error: 'Failed to save editorial board.' };
    }
  },

  deletePaper: async (paperId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/papers/${paperId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const data = await readJson(response);

      if (!response.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to delete paper.' };
      }

      return { success: true };
    } catch (error) {
      console.error('deletePaper error', error);
      return { success: false, error: 'Failed to delete paper.' };
    }
  }
};

// Admin helper methods attached after mockAPI definition
mockAPI.getReviewers = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/reviewers`, { headers: authHeaders() });
    const data = await readJson(response);

    if (!data.success || !Array.isArray(data.reviewers)) {
      return [];
    }

    return data.reviewers;
  } catch (error) {
    console.error('getReviewers error', error);
    return [];
  }
};

mockAPI.assignReviewer = async (paperId, reviewerId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/assign-reviewer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ paperId, reviewerId })
    });
    const data = await readJson(response);

    if (!data.success) {
      return { success: false, error: data.error || 'Failed to assign reviewer.' };
    }

    return { success: true };
  } catch (error) {
    console.error('assignReviewer error', error);
    return { success: false, error: 'Failed to assign reviewer.' };
  }
};

mockAPI.acceptPaper = async (paperId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/accept-paper`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ paperId })
    });
    const data = await readJson(response);

    if (!data.success) {
      return { success: false, error: data.error || 'Failed to accept paper.', code: data.code };
    }

    return { success: true };
  } catch (error) {
    console.error('acceptPaper error', error);
    return { success: false, error: 'Failed to accept paper.' };
  }
};

mockAPI.markPaymentReceived = async (paperId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/mark-paid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ paperId })
    });
    const data = await readJson(response);

    if (!data.success) {
      return { success: false, error: data.error || 'Failed to record the payment.' };
    }

    return { success: true };
  } catch (error) {
    console.error('markPaymentReceived error', error);
    return { success: false, error: 'Failed to record the payment.' };
  }
};

// doi: optional DOI registered with CrossRef for this paper.
mockAPI.publishPaper = async (paperId, doi) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/publish-paper`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ paperId, doi: doi || undefined })
    });
    const data = await readJson(response);

    if (!data.success) {
      return { success: false, error: data.error || 'Failed to publish paper.' };
    }

    return { success: true };
  } catch (error) {
    console.error('publishPaper error', error);
    return { success: false, error: 'Failed to publish paper.' };
  }
};

mockAPI.requestRevisions = async (paperId, note) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/request-revisions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ paperId, note }),
    });
    const data = await readJson(response);

    if (!data.success) {
      return { success: false, error: data.error || 'Failed to request revisions.' };
    }

    return { success: true };
  } catch (error) {
    console.error('requestRevisions error', error);
    return { success: false, error: 'Failed to request revisions.' };
  }
};

mockAPI.rejectPaper = async (paperId, note) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/reject-paper`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ paperId, note }),
    });
    const data = await readJson(response);

    if (!data.success) {
      return { success: false, error: data.error || 'Failed to reject paper.' };
    }

    return { success: true };
  } catch (error) {
    console.error('rejectPaper error', error);
    return { success: false, error: 'Failed to reject paper.' };
  }
};
