import React from 'react';
import { Leaf } from 'lucide-react';

export const AeroBackground = () => (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 bg-[#eef2ff]">
        <div className="absolute top-0 left-[-10%] w-[800px] h-[800px] bg-[#4f46e5]/60 rounded-full mix-blend-multiply filter blur-[100px] animate-blob"></div>
        <div className="absolute top-[-10%] right-[-10%] w-[700px] h-[700px] bg-[#06b6d4]/60 rounded-full mix-blend-multiply filter blur-[100px] animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-30%] left-[20%] w-[900px] h-[900px] bg-[#ec4899]/60 rounded-full mix-blend-multiply filter blur-[100px] animate-blob animation-delay-4000"></div>
    </div>
);

export const BauhausBackground = () => (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 bg-[#f0f0f0]">
        <div className="absolute top-0 left-0 w-full h-full opacity-10" style={{ backgroundImage: 'radial-gradient(#000 2px, transparent 2px)', backgroundSize: '30px 30px' }}></div>
        <div className="absolute top-[10%] left-[5%] w-64 h-64 bg-[#e63946] rounded-full mix-blend-multiply opacity-20"></div>
        <div className="absolute bottom-[20%] right-[10%] w-80 h-80 bg-[#457b9d] rounded-none rotate-12 mix-blend-multiply opacity-20"></div>
        <div className="absolute top-[40%] right-[20%] w-0 h-0 border-l-[120px] border-l-transparent border-b-[200px] border-b-[#ffb703] border-r-[120px] border-r-transparent mix-blend-multiply opacity-20 rotate-45"></div>
    </div>
);

export const BotanicalBackground = () => (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 bg-[#dad7cd]">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")' }}></div>
        <div className="absolute -bottom-20 -left-20 text-[#3a5a40] opacity-10 transform rotate-12">
            <Leaf size={600} />
        </div>
        <div className="absolute -top-20 -right-20 text-[#3a5a40] opacity-10 transform -rotate-45">
            <Leaf size={500} />
        </div>
    </div>
);
