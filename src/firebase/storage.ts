'use client';

import { getDoc, doc } from 'firebase/firestore';
import { firestore } from '@/firebase';
import { uploadFile as mediaHostUpload } from '@/lib/mediahost';

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

    try {
        const result = await mediaHostUpload(file, {
            apiUrl: apiUrl,
            onProgress: (pct, label) => {
                onProgress(pct);
                console.log(`Upload status: ${label}`);
            }
        });

        if (result && result.direct_url) {
            return result.direct_url;
        } else {
            throw new Error(result.error || 'Invalid response from upload API.');
        }
    } catch (error: any) {
        console.error('Upload failed:', error);
        if (error.message.includes('Failed to fetch')) {
            throw new Error('Network Error: Could not connect to the upload server. This is often a CORS issue. Please check your browser\'s developer console (Network tab) for more details.');
        }
        throw new Error(error.message || 'Upload failed due to an unknown error.');
    }
};
