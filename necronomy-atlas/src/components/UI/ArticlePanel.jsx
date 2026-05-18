import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'framer-motion';

const ArticlePanel = ({ article, isOpen, onClose }) => {
  if (!article) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="article-panel glass-panel"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          style={{
            position: 'fixed',
            right: 0,
            top: 0,
            width: '500px',
            maxWidth: '90vw',
            height: '100vh',
            padding: '40px',
            overflowY: 'auto',
            zIndex: 1000,
            background: 'rgba(15, 15, 20, 0.85)',
            backdropFilter: 'blur(20px)',
            borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.5)'
          }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: 'white',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              cursor: 'pointer',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.1)';
            }}
          >
            ×
          </button>

          {/* Article metadata */}
          <div style={{ marginBottom: '30px' }}>
            <div style={{
              fontSize: '12px',
              color: 'rgba(255, 255, 255, 0.5)',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              {article.location.name} • {article.date.year}
            </div>
            
            <h1 style={{
              fontSize: '28px',
              fontWeight: '700',
              color: 'white',
              marginBottom: '16px',
              lineHeight: '1.2'
            }}>
              {article.title}
            </h1>
            
            {article.excerpt && (
              <p style={{
                fontSize: '16px',
                color: 'rgba(255, 255, 255, 0.7)',
                lineHeight: '1.6',
                marginBottom: '24px'
              }}>
                {article.excerpt}
              </p>
            )}

            {/* Tags */}
            {article.tags && article.tags.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {article.tags.map(tag => (
                  <span
                    key={tag}
                    style={{
                      padding: '4px 12px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: 'rgba(255, 255, 255, 0.7)'
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Article content */}
          <div style={{
            color: 'rgba(255, 255, 255, 0.85)',
            fontSize: '15px',
            lineHeight: '1.7'
          }}>
            {article.content ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {article.content}
              </ReactMarkdown>
            ) : (
              <p style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                Content loading... (Article path: {article.articlePath})
              </p>
            )}
          </div>

          {/* Connections */}
          {article.connections && article.connections.length > 0 && (
            <div style={{
              marginTop: '40px',
              paddingTop: '24px',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <h3 style={{
                fontSize: '14px',
                color: 'rgba(255, 255, 255, 0.5)',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '12px'
              }}>
                Connected Events
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {article.connections.map(connId => (
                  <div
                    key={connId}
                    style={{
                      padding: '8px 12px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '6px',
                      fontSize: '13px',
                      color: 'rgba(255, 255, 255, 0.7)',
                      cursor: 'pointer'
                    }}
                  >
                    → {connId}
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ArticlePanel;
