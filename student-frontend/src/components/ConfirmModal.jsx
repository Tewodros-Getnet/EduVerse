import React from 'react';

export default function ConfirmModal({
    open,
    title = 'Confirm action',
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    onConfirm,
    onCancel,
}) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-lg rounded-3xl bg-[#12122a] border border-purple-900/40 shadow-2xl p-6">
                <div className="mb-4">
                    <h2 className="text-xl font-semibold text-white">{title}</h2>
                    <p className="mt-2 text-sm text-gray-300">{message}</p>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="w-full rounded-2xl border border-purple-900/40 bg-[#1a1a35] px-4 py-3 text-sm font-medium text-gray-300 transition hover:border-purple-500 hover:text-white sm:w-auto"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="w-full rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 sm:w-auto"
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
