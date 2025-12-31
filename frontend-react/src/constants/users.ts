
export enum UserRole {
    MP = 'МП',
    MRiZ = 'МРиЗ',
    BA = 'БА',
    NOR = 'НОР',
    RNR = 'РНР'
}

export const MOCK_USERS = [
    { id: 1, name: 'Иванов И.И.', role: UserRole.MP, email: 'ivanov@chizhik.ru' },
    { id: 2, name: 'Смирнов А.А.', role: UserRole.MRiZ, email: 'smirnov@chizhik.ru' },
    { id: 3, name: 'Кузнецов К.К.', role: UserRole.BA, email: 'kuznetsov@chizhik.ru' },
    { id: 4, name: 'Петров П.П.', role: UserRole.NOR, email: 'petrov@chizhik.ru' },
    { id: 5, name: 'Сидоров С.С.', role: UserRole.RNR, email: 'sidorov@chizhik.ru' }
];
