import React from 'react';
import { X } from 'lucide-react';
import { USER_CONTENT } from '../config';

const StatusCard = ({ onClose }) => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
        <div className="relative bg-white p-4 pb-12 shadow-2xl transform rotate-2 max-w-sm w-full animate-in fade-in zoom-in-95 duration-300">
            {/* Tape Effect */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-32 h-8 bg-white/30 backdrop-blur-sm border border-white/40 shadow-sm rotate-[-2deg] z-10"></div>

            <button
                onClick={onClose}
                className="absolute -top-4 -right-4 bg-black text-white rounded-full p-2 hover:scale-110 transition-transform shadow-lg z-20"
            >
                <X size={20} />
            </button>

            <div className="aspect-[4/5] bg-gray-100 overflow-hidden mb-4 border border-gray-200 shadow-inner">
                <img
                    src={USER_CONTENT.status.meta.photoUrl}
                    alt="Status Moment"
                    className="w-full h-full object-cover filter contrast-110 hover:scale-105 transition-transform duration-700"
                />
            </div>

            <div className="text-center px-2">
                <p className={`font-hand text-2xl text-gray-800 -rotate-1`}>
                    {USER_CONTENT.status.meta.note}
                </p>
                <p className="text-xs text-gray-400 mt-4 font-mono uppercase tracking-widest">
                    {USER_CONTENT.status.meta.date ?? new Date().toLocaleDateString()} • {USER_CONTENT.status.meta.location ?? USER_CONTENT.location}
                </p>
            </div>
        </div>
    </div>
);

export default StatusCard;
