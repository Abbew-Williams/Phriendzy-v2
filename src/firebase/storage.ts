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
 * Uploads a file to the custom media hosting service with progress tracking.
 * @param file The file to upload.
 * @param onProgress A callback function to report upload progress (0-100).
 * @returns A promise that resolves with the direct download URL of the uploaded file.
 */
export const uploadFile = async (file: File, onProgress: (percentage: number) => void): Promise<string> => {
    const apiUrl = await getMediaApiUrl();
    if (!apiUrl) {
        throw new Error('Media upload API URL is not configured in admin settings.');
    }

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.open("POST", apiUrl, true);

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                const percentage = Math.round((event.loaded / event.total) * 100);
                onProgress(percentage);
            }
        };

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const data = JSON.parse(xhr.responseText);
                    if (data && data.direct_url) {
                        onProgress(100); // Ensure it hits 100% on completion
                        resolve(data.direct_url);
                    } else {
                        reject(new Error('Invalid response from upload API. "direct_url" not found.'));
                    }
                } catch (e) {
                    reject(new Error('Failed to parse response from upload API.'));
                }
            } else {
                 reject(new Error(`Upload failed: ${xhr.statusText || 'Server error'}`));
            }
        };

        xhr.onerror = () => {
            reject(new Error('Upload failed due to a network error.'));
        };

        const formData = new FormData();
        formData.append("file", file);
        xhr.send(formData);
    });
};
