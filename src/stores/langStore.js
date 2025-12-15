import { atom } from 'nanostores';

export const lang = atom('zh');

export const toggleLang = () => {
    const current = lang.get();
    lang.set(current === 'zh' ? 'en' : 'zh');
};
