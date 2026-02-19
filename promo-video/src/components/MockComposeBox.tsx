import React from 'react';
import { COLORS, FONT_FAMILY } from '../styles/theme';

export const MockComposeBox: React.FC<{
  children: React.ReactNode;
  width?: number;
  showActionBar?: boolean;
}> = ({ children, width = 600, showActionBar = true }) => {
  return (
    <div
      style={{
        width,
        backgroundColor: COLORS.background,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 16,
        padding: 16,
        fontFamily: FONT_FAMILY,
      }}
    >
      <div style={{ display: 'flex', gap: 12 }}>
        {/* Avatar */}
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #1d9bf0, #1a8cd8)',
            flexShrink: 0,
          }}
        />
        {/* Content area */}
        <div style={{ flex: 1 }}>
          {/* Text area */}
          <div
            style={{
              minHeight: 60,
              fontSize: 20,
              color: COLORS.textPrimary,
              lineHeight: 1.5,
              paddingTop: 8,
              paddingBottom: 12,
            }}
          >
            {children}
          </div>
          {showActionBar && (
            <>
              {/* Divider */}
              <div
                style={{
                  height: 1,
                  backgroundColor: COLORS.border,
                  marginBottom: 12,
                }}
              />
              {/* Action bar */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                {/* Left icons */}
                <div style={{ display: 'flex', gap: 16 }}>
                  {['🖼️', '📊', '😊', '📅', '📍'].map((icon, i) => (
                    <div
                      key={i}
                      style={{
                        fontSize: 18,
                        color: COLORS.accentBlue,
                        opacity: 0.8,
                        cursor: 'pointer',
                      }}
                    >
                      {icon}
                    </div>
                  ))}
                </div>
                {/* Post button */}
                <div
                  style={{
                    backgroundColor: COLORS.accentBlue,
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: 15,
                    padding: '8px 20px',
                    borderRadius: 9999,
                    fontFamily: FONT_FAMILY,
                  }}
                >
                  Post
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
