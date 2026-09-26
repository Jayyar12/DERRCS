import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import DataTable from './DataTable';

describe('DataTable', () => {
  it('wraps children in an overflow-x-auto container', () => {
    const { container } = render(
      <DataTable>
        <table>
          <tbody>
            <tr>
              <td>Cell Data</td>
            </tr>
          </tbody>
        </table>
      </DataTable>
    );

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('overflow-x-auto');
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Cell Data')).toBeInTheDocument();
  });
});
