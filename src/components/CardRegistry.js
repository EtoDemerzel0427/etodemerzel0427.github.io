import BioCard from './cards/BioCard';
import MusicCard from './cards/MusicCard';
import ArchiveCard from './cards/ArchiveCard';
import TechCard from './cards/TechCard';
import ReadingCard from './cards/ReadingCard';
import ScoreCard from './cards/ScoreCard';
import QuoteCard from './cards/QuoteCard';
import GameCard from './cards/GameCard';
import ActivityCard from './cards/ActivityCard';

export const CardRegistry = {
    'bio': BioCard,
    'music': MusicCard,
    'archive': ArchiveCard,
    'tech': TechCard,
    'reading': ReadingCard,
    'score': ScoreCard,
    'quote': QuoteCard,
    'game': GameCard,
    'activity': ActivityCard,
};
