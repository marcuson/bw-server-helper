import axios from 'axios';
import { HealthchecksService } from './healthchecks.service';

jest.mock('axios', () => ({
  __esModule: true,
  default: { create: jest.fn() },
}));

describe('HealthchecksService', () => {
  const get = jest.fn();
  const use = jest.fn();
  const url = 'https://health.example.test/check-id?source=backup';
  let service: HealthchecksService;

  beforeEach(() => {
    jest.resetAllMocks();
    jest
      .mocked(axios.create)
      .mockReturnValue({ get, interceptors: { response: { use } } } as any);
    get.mockResolvedValue({ status: 200 });
    service = new HealthchecksService();
  });

  it('pings start before work and success afterward, preserving the query string', async () => {
    const events: string[] = [];
    get.mockImplementation(async (address: string) => {
      events.push(address);
    });
    await service.measuredCheck({ url }, async () => {
      events.push('work');
    });
    expect(events).toEqual([
      'https://health.example.test/check-id/start?source=backup',
      'work',
      url,
    ]);
  });

  it('pings failure and rethrows the original work error', async () => {
    const error = new Error('Backup failed');
    await expect(
      service.measuredCheck({ url }, async () => {
        throw error;
      }),
    ).rejects.toBe(error);
    expect(get.mock.calls).toEqual([
      ['https://health.example.test/check-id/start?source=backup'],
      ['https://health.example.test/check-id/fail?source=backup'],
    ]);
  });

  it('does not start work when the start ping fails', async () => {
    get.mockRejectedValueOnce(new Error('Network unavailable'));
    const work = jest.fn();
    await expect(service.measuredCheck({ url }, work)).rejects.toThrow(
      'Network unavailable',
    );
    expect(work).not.toHaveBeenCalled();
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('propagates a failed completion ping after successful work', async () => {
    get
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('Completion failed'));
    const work = jest.fn().mockResolvedValue(undefined);
    await expect(service.measuredCheck({ url }, work)).rejects.toThrow(
      'Completion failed',
    );
    expect(work).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('passes successful responses through its Axios interceptor', () => {
    const response = { status: 200 };
    expect(use.mock.calls[0][0](response)).toBe(response);
  });

  it('normalizes rejected Axios responses', async () => {
    await expect(
      use.mock.calls[0][1](new Error('Connection refused')),
    ).rejects.toThrow('Axios error encountered during HC call');
  });

  it('rejects invalid URLs before making requests or starting work', async () => {
    const work = jest.fn();
    await expect(
      service.measuredCheck({ url: 'invalid' }, work),
    ).rejects.toThrow();
    expect(get).not.toHaveBeenCalled();
    expect(work).not.toHaveBeenCalled();
  });
});
