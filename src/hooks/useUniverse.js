import { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { universe, DEFAULT_UNIVERSE } from '../stores/universeStore';

/**
 * Universe-aware hook for anything that renders markup.
 *
 * The pages are pre-rendered with DEFAULT_UNIVERSE while the live universe comes
 * from localStorage, so the two disagree whenever the visitor picked a theme.
 * React does not patch attribute mismatches it finds during hydration ("this
 * won't be patched up"), which left islands stuck on the pre-rendered theme after
 * a client-side navigation. Rendering DEFAULT_UNIVERSE until mounted keeps the
 * first render identical to the server markup; the real universe arrives in a
 * normal post-hydration update, which React does apply to the DOM.
 */
export const useUniverse = () => {
    const $universe = useStore(universe);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        setHydrated(true);
    }, []);

    return hydrated ? $universe : DEFAULT_UNIVERSE;
};

export default useUniverse;
