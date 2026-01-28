import React from 'react';

interface FooterProps {
  className?: string;
}

const Footer: React.FC<FooterProps> = ({ className = "" }) => {
  return (
    <div className={`flex justify-center py-8 ${className}`}>
      <p className="text-xs text-zinc-400 font-medium">
        Made with <span className="text-zinc-500">♥</span> by{' '}
        <a
          href="https://www.linkedin.com/in/sumeetsinghmankoo/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-500 hover:text-zinc-700 transition-colors"
        >
          Sumeet Singh Mankoo
        </a>
      </p>
    </div>
  );
};

export default Footer;
