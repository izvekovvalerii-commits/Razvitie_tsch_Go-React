import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Welcome.css';

interface Snowflake {
    id: number;
    left: number;
    delay: string;
    duration: string;
}

const Welcome: React.FC = () => {
    const navigate = useNavigate();
    const [snowflakes, setSnowflakes] = useState<Snowflake[]>([]);

    useEffect(() => {
        const snowflakeCount = 50;
        const flakes: Snowflake[] = [];
        for (let i = 0; i < snowflakeCount; i++) {
            flakes.push({
                id: i,
                left: Math.random() * 100,
                delay: `${Math.random() * 5}s`,
                duration: `${5 + Math.random() * 10}s`
            });
        }
        setSnowflakes(flakes);
    }, []);

    const onStartClick = () => {
        navigate('/home');
    };

    return (
        <section className="hero">
            {/* Snow Animation */}
            <div className="snowfall">
                {snowflakes.map(flake => (
                    <div
                        key={flake.id}
                        className="snowflake"
                        style={{
                            left: `${flake.left}%`,
                            animationDelay: flake.delay,
                            animationDuration: flake.duration
                        }}
                    >
                        ❄
                    </div>
                ))}
            </div>

            <div className="container">
                <div className="hero-content">
                    <div className="hero-text">
                        <h1 className="hero-title">Портал Развития</h1>
                        <p className="hero-subtitle">Работа с проектами развития ТС Чижик</p>
                        <button className="start-button" onClick={onStartClick}>Старт</button>
                    </div>

                    <div className="hero-illustration">
                        <div className="mountain">
                            <svg viewBox="0 0 800 600" fill="none" xmlns="http://www.w3.org/2000/svg">
                                {/* Clouds */}
                                <g opacity="1">
                                    <path d="M80 200 Q 60 200 50 180 Q 40 150 70 145 Q 90 120 120 135 Q 150 120 170 145 Q 190 170 170 190 Q 150 210 120 200 Z" fill="#FFFBE6" />
                                    <ellipse cx="350" cy="80" rx="40" ry="22" fill="#FFFBE6" />
                                    <ellipse cx="380" cy="90" rx="30" ry="18" fill="#FFFBE6" />
                                    <ellipse cx="700" cy="120" rx="65" ry="35" fill="#FFFBE6" />
                                    <path d="M720 250 Q 700 250 690 235 Q 680 210 700 205 Q 720 190 750 200 Q 770 190 790 210 Q 800 230 780 245 Q 760 255 720 250 Z" fill="#FFFBE6" />
                                    <ellipse cx="580" cy="160" rx="25" ry="14" fill="#FFFBE6" />
                                </g>

                                {/* COMPOSITE MOUNTAIN LANDSCAPE */}
                                <path d="M 0 600 L 250 350 L 400 500 L 200 600 Z" fill="#fff" stroke="#000" strokeWidth="12" strokeLinejoin="round" />
                                <path d="M 150 600 L 500 80 L 800 550 L 800 600 L 150 600 Z" fill="#fff" stroke="#000" strokeWidth="12" strokeLinejoin="round" />
                                <path d="M 100 600 L 230 460 L 280 600 Z" fill="#000" />
                                <path d="M 650 600 L 700 450 L 730 480 L 760 350 L 800 450 L 800 600 Z" fill="#000" stroke="#000" strokeWidth="8" strokeLinejoin="round" />
                                <rect x="0" y="580" width="800" height="20" fill="#000" />

                                {/* BIRDS */}
                                <g className="bird bird-climbing">
                                    <g transform="translate(440, 180) rotate(-45)">
                                        <image href="/images/chizhik_transparent.png" x="-45" y="-50" width="90" height="90" />
                                    </g>
                                </g>

                                <g className="bird bird-right-slope">
                                    <g transform="translate(620, 280) rotate(45) scale(-1, 1)">
                                        <image href="/images/chizhik_transparent.png" x="-45" y="-50" width="90" height="90" />
                                    </g>
                                </g>
                            </svg>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Welcome;
