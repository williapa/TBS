import { render, screen } from '@testing-library/react';
import { InMemoryGameSessionGateway, InMemoryGameSessionStore } from '@TBS/adapter-memory';
import { applyStandardAction } from '@TBS/game-rules';
import App from '../src/App';

test('renders the game creation route', async () => {
  const gateway = new InMemoryGameSessionGateway(
    new InMemoryGameSessionStore(applyStandardAction),
    'test-user',
  );
  render(<App gateway={gateway} />);
  expect(await screen.findByRole('heading', { name: 'Start a game' })).toBeInTheDocument();
});
