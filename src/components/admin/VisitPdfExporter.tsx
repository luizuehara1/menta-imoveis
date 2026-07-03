import React from 'react';
import { Visit, Property, SiteConfig } from '../../types';
import { VisitReportRenderer } from '../../lib/pdf/VisitReportRenderer';

interface VisitPdfTemplateProps {
  visit: Visit;
  property: Property | null;
  settings: SiteConfig;
}

export const VisitPdfTemplate = React.forwardRef<HTMLDivElement, VisitPdfTemplateProps>(
  ({ visit, property, settings }, ref) => {
    return (
      <div 
        id="visita-pdf" 
        ref={ref} 
        className="pdf-export-container bg-transparent mx-auto select-none"
        style={{ boxSizing: 'border-box' }}
      >
        <VisitReportRenderer visit={visit} property={property} settings={settings} />
      </div>
    );
  }
);

VisitPdfTemplate.displayName = 'VisitPdfTemplate';
