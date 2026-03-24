'use client';

import { getDoc, doc } from 'firebase/firestore';
import { firestore } from '@/firebase';

// Helper function to get the media API URL from settings
const getMediaApiUrl = async (): Promise<string> => {
    const settingsRef = doc(firestore, 'config', 'appSettings');
    const settingsSnap = await getDoc(settingsRef);
    if (settingsSnap.exists()) {
        const settingsData = settingsSnap.data();
        return settingsData.mediaApiBaseUrl || '';
    }
    return '';
};


/**
 * Uploads a file to the custom media hosting service.
 * @param file The file to upload.
 * @param path The path is ignored for this custom uploader but kept for compatibility.
 * @returns A promise that resolves with the direct download URL of the uploaded file.
 */
export const uploadFile = async (file: File, path?: string): Promise<string> => {
    const apiUrl = await getMediaApiUrl();
    if (!apiUrl) {
        throw new Error('Media upload API URL is not configured in admin settings.');
    }

    const form = new FormData();
    form.append("file", file);

    try {
        const res = await fetch(apiUrl, {
            method: "POST",
            body: form,
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Upload failed with status ${res.status}: ${errorText}`);
        }

        const data = await res.json();
        
        if (data && data.direct_url) {
            return data.direct_url;
        } else {
            throw new Error('Invalid response from upload API. "direct_url" not found.');
        }
    } catch (error) {
        console.error("Custom media upload failed:", error);
        throw error; // Re-throw the error to be caught by the calling component
    }
};
