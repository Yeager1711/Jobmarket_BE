/**
 * Hàm sắp xếp danh sách kinh nghiệm theo thứ tự ưu tiên
 * @param {string[]} experienceArray - Mảng kinh nghiệm
 * @returns {string[]} - Mảng đã được sắp xếp
 */
export function sortExperience(experienceArray: string[]): string[] {
    return experienceArray.sort((a, b) => {
        // Chuyển chuỗi thành chữ thường để so sánh dễ dàng hơn
        const aLower = a.toLowerCase();
        const bLower = b.toLowerCase();

        // Kiểm tra 'Not required' luôn đứng đầu
        if (aLower === "not required") return -1;
        if (bLower === "not required") return 1;

        // Kiểm tra 'From 06 months' đứng trước các giá trị 'years'
        const aMonthsMatch = aLower.match(/from (\d+) months/i);
        const bMonthsMatch = bLower.match(/from (\d+) months/i);

        if (aMonthsMatch && !bMonthsMatch) return -1; // 'From 06 months' trước các 'From x years'
        if (!aMonthsMatch && bMonthsMatch) return 1;

        // Kiểm tra 'Above 10 years' nằm sau 'From 10 years'
        const aAbove10 = aLower === "above 10 years";
        const bAbove10 = bLower === "above 10 years";

        if (aAbove10 && !bAbove10) return 1; // 'Above 10 years' sau 'From 10 years'
        if (!aAbove10 && bAbove10) return -1;

        // Lấy số năm từ chuỗi 'From x years'
        const aMatch = a.match(/from (\d+)/i);
        const bMatch = b.match(/from (\d+)/i);

        const aValue = aMatch ? parseInt(aMatch[1], 10) : 0;
        const bValue = bMatch ? parseInt(bMatch[1], 10) : 0;

        // Sắp xếp theo giá trị số năm
        return aValue - bValue;
    });
}
