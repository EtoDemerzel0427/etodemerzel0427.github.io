import {
    Zap, Monitor, Cloud, Palette, Ghost, Hash, Triangle, FileText, Book, Coffee as CoffeeIcon, Leaf, Activity
} from 'lucide-react';

export const UNIVERSE_OPTIONS = [
    { id: 'neon', label: 'Neon', desc: 'Vibrant & Modern', icon: Zap, color: 'from-blue-400 to-purple-500' },
    { id: 'noir', label: 'Noir', desc: 'Dark & Minimal', icon: Monitor, color: 'from-gray-700 to-black' },
    { id: 'aero', label: 'Aero', desc: 'Glass & Fluid', icon: Cloud, color: 'from-cyan-400 to-blue-500' },
    { id: 'punk', label: 'Punk', desc: 'Bold & Brutal', icon: Palette, color: 'from-yellow-400 to-red-500' },
    { id: 'retro', label: 'Retro', desc: '8-Bit Arcade', icon: Ghost, color: 'from-red-500 to-pink-500' },
    { id: 'terminal', label: 'Terminal', desc: 'Hacker Console', icon: Hash, color: 'from-green-400 to-green-600' },
    { id: 'bauhaus', label: 'Bauhaus', desc: 'Geometric Art', icon: Triangle, color: 'from-red-600 to-yellow-500' },
    { id: 'newspaper', label: 'Times', desc: 'Classic Editorial', icon: FileText, color: 'from-gray-400 to-gray-600' },
    { id: 'comic', label: 'Comic', desc: 'Western Style', icon: Book, color: 'from-gray-800 to-black' },
    { id: 'lofi', label: 'Lofi', desc: 'Cozy Vibes', icon: CoffeeIcon, color: 'from-yellow-600 to-yellow-800' },
    { id: 'botanical', label: 'Botanical', desc: 'Organic Nature', icon: Leaf, color: 'from-green-700 to-green-900' },
    { id: 'cyberpunk', label: 'Cyberpunk', desc: '2077 Night City', icon: Activity, color: 'from-yellow-400 to-yellow-600' },
];
