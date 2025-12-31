import React from 'react';
import './Footer.css';

export const Footer: React.FC = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="footer">
            <div className="container">
                <div className="footer-content">
                    <p className="copyright">
                        ©{currentYear}, Корпоративный портал развития торговой сети "Чижик"
                    </p>

                    <a href="/privacy" className="privacy-link">
                        Политика конфиденциальности
                    </a>
                </div>
            </div>
        </footer>
    );
};
