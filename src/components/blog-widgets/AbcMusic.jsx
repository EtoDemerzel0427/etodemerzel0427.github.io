import React, { useEffect, useMemo, useRef, useState } from 'react';
import ABCJS from 'abcjs';
import 'abcjs/abcjs-audio.css';

const ACTIVE_NOTE_CLASS = 'abcjs-note-active';

const getTitleFromAbc = (abc) => {
    const titleLine = abc.match(/^T:\s*(.+)$/m);
    return titleLine ? titleLine[1].trim() : 'ABC music example';
};

const flattenElements = (groups) => {
    if (!Array.isArray(groups)) return [];
    return groups.flat(Number.POSITIVE_INFINITY).filter(Boolean);
};

const AbcMusic = ({ abc }) => {
    const paperRef = useRef(null);
    const audioRef = useRef(null);
    const controllerRef = useRef(null);
    const [status, setStatus] = useState('rendering');
    const [message, setMessage] = useState('');

    const source = useMemo(() => String(abc || '').trim(), [abc]);
    const title = useMemo(() => getTitleFromAbc(source), [source]);

    useEffect(() => {
        let isMounted = true;
        const paper = paperRef.current;
        const audio = audioRef.current;

        const clearActiveNotes = () => {
            paper?.querySelectorAll(`.${ACTIVE_NOTE_CLASS}`).forEach((element) => {
                element.classList.remove(ACTIVE_NOTE_CLASS);
            });
        };

        if (!paper || !audio || !source) return undefined;

        paper.innerHTML = '';
        audio.innerHTML = '';
        clearActiveNotes();
        controllerRef.current?.destroy?.();
        controllerRef.current = null;
        setStatus('rendering');
        setMessage('');

        try {
            const visualObjects = ABCJS.renderAbc(paper, source, {
                add_classes: true,
                responsive: 'resize',
                staffwidth: 620,
                scale: 0.92,
                paddingtop: 8,
                paddingbottom: 12,
                paddingleft: 14,
                paddingright: 18,
                foregroundColor: '#111827',
                selectionColor: '#e11d48',
                format: {
                    titlefont: {
                        face: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                        size: 18,
                        weight: '600',
                        style: 'normal',
                        decoration: 'none',
                    },
                    tempofont: {
                        face: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                        size: 12,
                        weight: '600',
                        style: 'normal',
                        decoration: 'none',
                    },
                    gchordfont: {
                        face: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                        size: 13,
                        weight: '600',
                        style: 'normal',
                        decoration: 'none',
                    },
                },
            });

            const visualObj = visualObjects?.[0];
            if (!visualObj) {
                throw new Error('No tune was rendered from this ABC block.');
            }

            if (!ABCJS.synth.supportsAudio()) {
                setStatus('unsupported');
                setMessage('Audio is not supported in this browser.');
                return undefined;
            }

            const synthControl = new ABCJS.synth.SynthController();
            controllerRef.current = synthControl;

            const cursorControl = {
                onStart: () => {
                    if (isMounted) setStatus('playing');
                },
                onEvent: (event) => {
                    clearActiveNotes();
                    flattenElements(event?.elements).forEach((element) => {
                        element.classList.add(ACTIVE_NOTE_CLASS);
                    });
                },
                onFinished: () => {
                    clearActiveNotes();
                    if (isMounted) setStatus('ready');
                },
            };

            synthControl.load(audio, cursorControl, {
                displayLoop: true,
                displayRestart: true,
                displayPlay: true,
                displayProgress: true,
                displayWarp: false,
            });

            synthControl
                .setTune(visualObj, false, { chordsOff: true })
                .then(() => {
                    if (isMounted) setStatus('ready');
                })
                .catch((error) => {
                    console.warn('ABC audio setup failed:', error);
                    if (isMounted) {
                        setStatus('error');
                        setMessage('Audio could not be prepared for this score.');
                    }
                });
        } catch (error) {
            console.warn('ABC rendering failed:', error);
            if (isMounted) {
                setStatus('error');
                setMessage(error.message || 'This ABC score could not be rendered.');
            }
        }

        return () => {
            isMounted = false;
            clearActiveNotes();
            controllerRef.current?.destroy?.();
            controllerRef.current = null;
        };
    }, [source]);

    return (
        <figure className="abc-music-widget my-8 break-inside-avoid [column-span:all]" aria-label={title}>
            <div className="abc-music-paper" ref={paperRef} />
            <div className="abc-music-controls" ref={audioRef} />
            <figcaption className="sr-only" aria-live="polite">
                {status === 'ready' ? 'Score is ready to play.' : status}
            </figcaption>
            {message && (
                <p className="abc-music-message" role="status">
                    {message}
                </p>
            )}
        </figure>
    );
};

export default AbcMusic;
