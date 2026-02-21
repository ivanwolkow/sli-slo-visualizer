import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders site contact footer with mailto link', () => {
    render(<App />);

    expect(screen.getByText('Built by Ivan Volkov')).toBeInTheDocument();

    const contactLink = screen.getByRole('link', { name: 'imwolkow@gmail.com' });
    expect(contactLink).toHaveAttribute('href', 'mailto:imwolkow@gmail.com');
  });
});
