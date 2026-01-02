const BASE_URL = '/api';

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
    const userId = localStorage.getItem('user_id');
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(userId ? { 'X-User-ID': userId } : {}),
        ...options.headers,
    };

    // endpoint starts with / usually
    const url = `${BASE_URL}${endpoint}`;

    const response = await fetch(url, {
        ...options,
        headers,
    });

    if (!response.ok) {
        // Optionally parse error
        if (response.status === 401 || response.status === 403) {
            console.error("Auth Error:", response.status);
        }
        // Let the caller handle the error body decoding
    }

    return response;
};
