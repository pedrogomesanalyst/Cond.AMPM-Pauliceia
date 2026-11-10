import './globals.css';
import type {Metadata} from 'next';
import type {ReactNode} from 'react';
export const metadata:Metadata={title:'AMPM Paulicéia | Portal do Morador',description:'Gestão condominial com segurança e transparência.'};
export default function RootLayout({children}:{children:ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>;}
