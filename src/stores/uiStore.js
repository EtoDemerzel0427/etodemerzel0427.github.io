import { atom } from 'nanostores';

export const showStatusCard = atom(false);

export const setShowStatusCard = (show) => {
    showStatusCard.set(show);
};
