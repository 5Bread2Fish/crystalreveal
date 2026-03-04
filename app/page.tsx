import { redirect } from 'next/navigation';

export default function RootPage() {
    // 미들웨어가 놓쳤을 경우 최후의 보루로 작동하여 기본 언어로 넘김
    redirect('/en');
}
