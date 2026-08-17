import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Handler untuk UPDATE quantity (tombol + / -)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const { quantity } = body;

    if (typeof quantity !== 'number' || quantity < 1) {
      return NextResponse.json({ error: 'Quantity minimal 1.' }, { status: 400 });
    }

    const { error } = await supabase
      .from('ingredients')
      .update({ quantity })
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ status: 'success', message: 'Jumlah diperbarui.' }, { status: 200 });
  } catch (error: any) {
    console.error('❌ Error PATCH /api/ingredients/[id]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Handler untuk DELETE (tombol trash)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const { error } = await supabase
      .from('ingredients')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ status: 'success', message: 'Bahan dihapus.' }, { status: 200 });
  } catch (error: any) {
    console.error('❌ Error DELETE /api/ingredients/[id]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
