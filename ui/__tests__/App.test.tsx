import { render, screen } from '@testing-library/react';
import { InMemoryGameSessionGateway, InMemoryGameSessionStore } from '@TBS/adapter-memory';
import App from '../src/App';

test('renders the game creation route', async () => {
  const gateway = new InMemoryGameSessionGateway(new InMemoryGameSessionStore(), 'test-user');
  render(<App gateway={gateway} />);
  expect(await screen.findByRole('heading', { name: 'Start a game' })).toBeInTheDocument();
});
